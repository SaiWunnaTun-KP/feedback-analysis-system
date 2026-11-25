import { Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware.js';
import { stripe, getOrCreateCustomer } from '../../services/stripe.service.js';
import * as subscriptionsService from './subscriptions.service.js';

// In-memory registry of subscriptions scheduled to cancel at period end
export const pendingCancellations = new Set<string>();

export async function getMySubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    await subscriptionsService.checkInactivePlanExpirations();

    const user = await subscriptionsService.getUserFreeTrialStatus(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscription = await subscriptionsService.findActiveSubscription(userId);

    if (subscription) {
      let cancelAtPeriodEnd = false;
      if (subscription.stripeSubscriptionId) {
        if (pendingCancellations.has(subscription.stripeSubscriptionId)) {
          cancelAtPeriodEnd = true;
        } else if (!subscription.stripeSubscriptionId.startsWith('mock_')) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
            cancelAtPeriodEnd = Boolean(stripeSub.cancel_at_period_end);
            if (cancelAtPeriodEnd) {
              pendingCancellations.add(subscription.stripeSubscriptionId);
            }
          } catch (err) {
            console.warn('Could not check Stripe cancel_at_period_end:', err);
          }
        }
      }

      const plan = await subscriptionsService.findPlanById(subscription.planId);
      return res.json({
        hasUsedFreeTrial: user.hasUsedFreeTrial,
        subscription: {
          ...subscription,
          cancelAtPeriodEnd,
        },
        plan,
      });
    }

    res.json({
      hasUsedFreeTrial: user.hasUsedFreeTrial,
      subscription: null,
      plan: null,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createSubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { planId } = req.body;

    const user = await subscriptionsService.getUserById(userId);
    const plan = await subscriptionsService.findPlanById(planId);

    if (!user || !plan) {
      return res.status(404).json({ error: 'User or Plan not found' });
    }

    if (!plan.stripePriceId) {
      return res.status(400).json({ error: 'Plan is not synced with Stripe' });
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await getOrCreateCustomer(user.email, user.companyName || user.username);
      stripeCustomerId = customer.id;
      await subscriptionsService.updateUserStripeCustomerId(user.id, stripeCustomerId);
    }

    const existingSub = await subscriptionsService.findAnySubscriptionForUser(userId);

    if (existingSub && existingSub.status === 'INCOMPLETE' && existingSub.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(existingSub.stripeSubscriptionId);
      } catch {
        // Safe to ignore if already canceled
      }
    }

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

    await subscriptionsService.upsertIncompleteSubscription({
      existingSubId: existingSub?.id,
      userId,
      planId: plan.id,
      stripeSubscriptionId: subscription.id,
      startDate,
      endDate,
    });

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent;

    res.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function cancelSubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const activeSub = await subscriptionsService.findActiveSubscription(userId);

    if (!activeSub || !activeSub.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active Stripe subscription found' });
    }

    await stripe.subscriptions.update(activeSub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    pendingCancellations.add(activeSub.stripeSubscriptionId);

    res.json({
      message: 'Subscription set to cancel at period end',
      subscription: {
        ...activeSub,
        cancelAtPeriodEnd: true,
      },
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function purchasePlanMock(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    const plan = await subscriptionsService.findPlanById(planId);
    if (!plan || plan.status !== 'ACTIVE') {
      return res.status(404).json({ error: 'Plan not found or inactive' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const existingSub = await subscriptionsService.findAnySubscriptionForUser(userId);
    const subscription = await subscriptionsService.activateOrUpgradeSubscription({
      existingSubId: existingSub?.id,
      userId,
      planId: plan.id,
      startDate,
      endDate,
    });

    res.json({ message: 'Purchase successful', subscription, plan });
  } catch (error) {
    console.error('Error processing purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getInvoices(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const offset = req.query.offset !== undefined
      ? Math.max(0, parseInt(req.query.offset as string, 10) || 0)
      : (page - 1) * limit;

    const user = await subscriptionsService.getUserById(userId);

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
      status: 'paid',
      limit: 100,
    });

    const paidInvoices = allInvoices.data.filter((inv) => inv.status === 'paid');
    const total = paidInvoices.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedInvoices = paidInvoices.slice(offset, offset + limit);

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
}

export async function syncSubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const activeSub = await subscriptionsService.findAnySubscriptionForUser(userId);

    if (!activeSub || !activeSub.stripeSubscriptionId) {
      return res.json({ synced: false });
    }

    const stripeSub: any = await stripe.subscriptions.retrieve(activeSub.stripeSubscriptionId);
    let status = 'ACTIVE';

    if (stripeSub.status === 'canceled') status = 'CANCELED';
    else if (stripeSub.status === 'past_due') status = 'PAST_DUE';
    else if (stripeSub.status === 'incomplete') status = 'INCOMPLETE';
    else if (stripeSub.status === 'trialing') status = 'TRIALING';
    else if (stripeSub.status !== 'active') status = 'EXPIRED';

    const periodEndEpoch = stripeSub.current_period_end ?? Math.floor(Date.now() / 1000);
    const currentPeriodEnd = new Date(periodEndEpoch * 1000);

    await subscriptionsService.syncSubscriptionRecord(activeSub.id, status, currentPeriodEnd);

    res.json({ synced: true, status });
  } catch (error) {
    console.error('Error syncing subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
