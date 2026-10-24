import { Router } from 'express';
import { db } from '../database/index.ts';
import { activeSubscriptions, plans, users } from '../database/schema.ts';
import { eq, and, sql } from 'drizzle-orm';
import { authenticate } from '../middlewares/authMiddleware.ts';
import { stripe, getOrCreateCustomer } from '../services/stripe.service.ts';

const router = Router();

// Helper: migrate users whose inactive plan billing period has ended to Free (EXPIRED)
export async function checkInactivePlanExpirations() {
  const now = new Date();
  try {
    await db.execute(sql`
      UPDATE active_subscriptions
      SET status = 'EXPIRED', updated_at = NOW()
      FROM plans
      WHERE active_subscriptions.plan_id = plans.id
        AND plans.status = 'INACTIVE'
        AND active_subscriptions.status = 'ACTIVE'
        AND (
          (active_subscriptions.current_period_end IS NOT NULL AND active_subscriptions.current_period_end < ${now})
          OR
          (active_subscriptions.current_period_end IS NULL AND active_subscriptions.end_date < ${now})
        )
    `);
  } catch (err) {
    console.error('Error checking inactive plan expirations:', err);
  }
}

// GET /api/subscriptions/me
// Fetch user's current subscription status and quota
router.get('/me', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    // First check and expire any inactive plan subscriptions past period end
    await checkInactivePlanExpirations();

    // Check if they have used free trial
    const [user] = await db.select({ hasUsedFreeTrial: users.hasUsedFreeTrial }).from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for an active subscription
    const [subscription] = await db
      .select()
      .from(activeSubscriptions)
      .where(and(eq(activeSubscriptions.userId, userId), eq(activeSubscriptions.status, 'ACTIVE')));

    if (subscription) {
      // Return their active subscription details
      const [plan] = await db.select().from(plans).where(eq(plans.id, subscription.planId));
      return res.json({
        hasUsedFreeTrial: user.hasUsedFreeTrial,
        subscription,
        plan
      });
    }

    // No active subscription, but return free trial status
    res.json({
      hasUsedFreeTrial: user.hasUsedFreeTrial,
      subscription: null,
      plan: null
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/create
router.post('/create', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { planId } = req.body;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const [plan] = await db.select().from(plans).where(eq(plans.id, planId));

    if (!user || !plan) {
      return res.status(404).json({ error: 'User or Plan not found' });
    }

    if (!plan.stripePriceId) {
      return res.status(400).json({ error: 'Plan is not synced with Stripe' });
    }

    // Get or Create Stripe Customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await getOrCreateCustomer(user.email, user.companyName || user.username);
      stripeCustomerId = customer.id;
      await db.update(users).set({ stripeCustomerId }).where(eq(users.id, user.id));
    }

    // Create a subscription with default_incomplete and restrict to card
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: plan.stripePriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice.payment_intent'],
    });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const [existingSub] = await db
      .select()
      .from(activeSubscriptions)
      .where(eq(activeSubscriptions.userId, userId));

    if (existingSub) {
      await db.update(activeSubscriptions).set({
        planId: plan.id,
        stripeSubscriptionId: subscription.id,
        startDate,
        endDate,
        status: 'INCOMPLETE',
        updatedAt: new Date()
      }).where(eq(activeSubscriptions.id, existingSub.id));
    } else {
      await db.insert(activeSubscriptions).values({
        userId,
        planId: plan.id,
        stripeSubscriptionId: subscription.id,
        startDate,
        endDate,
        status: 'INCOMPLETE'
      });
    }

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent;

    res.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/cancel
router.post('/cancel', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    const [activeSub] = await db
      .select()
      .from(activeSubscriptions)
      .where(and(eq(activeSubscriptions.userId, userId), eq(activeSubscriptions.status, 'ACTIVE')));

    if (!activeSub || !activeSub.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active Stripe subscription found' });
    }

    // Cancel at period end
    const canceledSub = await stripe.subscriptions.update(
      activeSub.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    res.json({ message: 'Subscription set to cancel at period end', subscription: canceledSub });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/purchase
// Mock payment endpoint to buy/upgrade a plan
router.post('/purchase', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    // Verify plan exists and is active
    const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
    if (!plan || plan.status !== 'ACTIVE') {
      return res.status(404).json({ error: 'Plan not found or inactive' });
    }

    // Calculate end date (now + durationDays)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    // Check if user already has a subscription
    const [existingSub] = await db
      .select()
      .from(activeSubscriptions)
      .where(eq(activeSubscriptions.userId, userId));

    let subscription;

    if (existingSub) {
      // Update existing subscription
      [subscription] = await db.update(activeSubscriptions).set({
        planId: plan.id,
        startDate,
        endDate,
        status: 'ACTIVE',
        updatedAt: new Date()
      })
      .where(eq(activeSubscriptions.id, existingSub.id))
      .returning();
    } else {
      // Create new subscription
      [subscription] = await db.insert(activeSubscriptions).values({
        userId,
        planId: plan.id,
        startDate,
        endDate,
        usedStorageMb: '0',
        status: 'ACTIVE'
      }).returning();
    }

    res.json({ message: 'Purchase successful', subscription, plan });
  } catch (error) {
    console.error('Error processing purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/subscriptions/invoices
router.get('/invoices', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const offset = req.query.offset !== undefined
      ? Math.max(0, parseInt(req.query.offset as string, 10) || 0)
      : (page - 1) * limit;

    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user || !user.stripeCustomerId) {
      return res.json({
        invoices: [],
        pagination: {
          total: 0,
          page,
          limit,
          offset,
          totalPages: 1,
        },
      });
    }

    const allInvoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 100,
    });

    const total = allInvoices.data.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedInvoices = allInvoices.data.slice(offset, offset + limit);

    res.json({
      invoices: paginatedInvoices,
      pagination: {
        total,
        page,
        limit,
        offset,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/sync
router.post('/sync', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const [activeSub] = await db
      .select()
      .from(activeSubscriptions)
      .where(eq(activeSubscriptions.userId, userId));

    if (!activeSub || !activeSub.stripeSubscriptionId) {
      return res.json({ synced: false });
    }

    const stripeSub = await stripe.subscriptions.retrieve(activeSub.stripeSubscriptionId);
    let status = 'ACTIVE';

    if (stripeSub.status === 'canceled') status = 'CANCELED';
    else if (stripeSub.status === 'past_due') status = 'PAST_DUE';
    else if (stripeSub.status === 'incomplete') status = 'INCOMPLETE';
    else if (stripeSub.status === 'trialing') status = 'TRIALING';
    else if (stripeSub.status !== 'active') status = 'EXPIRED';

    const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);

    await db.update(activeSubscriptions).set({
      status: status as any,
      currentPeriodEnd,
      endDate: currentPeriodEnd,
      updatedAt: new Date()
    }).where(eq(activeSubscriptions.id, activeSub.id));

    res.json({ synced: true, status });
  } catch (error) {
    console.error('Error syncing subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
