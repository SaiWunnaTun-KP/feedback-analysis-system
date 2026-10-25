import { Router } from 'express';
import { db } from '../database/index.js';
import { plans, activeSubscriptions, planAnnouncements, users } from '../database/schema.js';
import { eq, and, count, ilike } from 'drizzle-orm';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middlewares/authMiddleware.js';
import { createStripeProduct, createStripePrice } from '../services/stripe.service.js';
import { sendPlanAnnouncementEmail } from '../services/emailService.js';

const router = Router();

// GET /api/plans & GET /api/admin/plans
// Public/Auth'd to see available active plans (Admins see all with subscriber count, search & pagination)
router.get('/', optionalAuthenticate, async (req: any, res) => {
  try {
    if (req.user?.role === 'ADMIN') {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = req.query.search ? (req.query.search as string).trim() : undefined;

      const whereClause = search ? ilike(plans.name, `%${search}%`) : undefined;

      // If server-driven pagination/search is requested
      if (page !== undefined || limit !== undefined || search !== undefined) {
        const currentPage = Math.max(1, page || 1);
        const pageSize = Math.max(1, limit || 10);
        const offset = (currentPage - 1) * pageSize;

        // Total count matching search query
        const countQuery = db.select({ total: count() }).from(plans);
        if (whereClause) {
          countQuery.where(whereClause);
        }
        const [totalResult] = await countQuery;
        const total = Number(totalResult?.total || 0);

        // Paginated plans query
        const dataQuery = db.select().from(plans);
        if (whereClause) {
          dataQuery.where(whereClause);
        }
        const pagedPlans = await dataQuery.orderBy(plans.id).limit(pageSize).offset(offset);

        // Active subscriber counts for mapping
        const subsCounts = await db
          .select({
            planId: activeSubscriptions.planId,
            count: count(),
          })
          .from(activeSubscriptions)
          .where(eq(activeSubscriptions.status, 'ACTIVE'))
          .groupBy(activeSubscriptions.planId);

        const countMap = new Map<number, number>();
        for (const row of subsCounts) {
          countMap.set(row.planId, Number(row.count));
        }

        const plansWithSubscribers = pagedPlans.map((p) => ({
          ...p,
          activeSubscribers: countMap.get(p.id) || 0,
        }));

        return res.json({
          data: plansWithSubscribers,
          pagination: {
            total,
            page: currentPage,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize) || 1,
          },
        });
      }

      // Backward compatible: return all plans with subscriber counts
      const allPlans = await db.select().from(plans).orderBy(plans.id);
      
      const subsCounts = await db
        .select({
          planId: activeSubscriptions.planId,
          count: count(),
        })
        .from(activeSubscriptions)
        .where(eq(activeSubscriptions.status, 'ACTIVE'))
        .groupBy(activeSubscriptions.planId);

      const countMap = new Map<number, number>();
      for (const row of subsCounts) {
        countMap.set(row.planId, Number(row.count));
      }

      const plansWithSubscribers = allPlans.map((p) => ({
        ...p,
        activeSubscribers: countMap.get(p.id) || 0,
      }));

      return res.json(plansWithSubscribers);
    } else {
      const allPlans = await db.select().from(plans).where(eq(plans.status, 'ACTIVE')).orderBy(plans.id);
      return res.json(allPlans);
    }
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/plans & POST /api/admin/plans
// Admin only - Create a new plan
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, price, maxStorageMb, storage_quota, durationDays, duration } = req.body;
    
    const quota = maxStorageMb !== undefined ? maxStorageMb : storage_quota;
    const dur = durationDays !== undefined ? durationDays : duration;

    if (!name || price === undefined || !quota) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Create Stripe Product
    const stripeProduct = await createStripeProduct(name, `Storage: ${quota}MB`);
    
    // 2. Create Stripe Price
    const priceFloat = typeof price === 'string' ? parseFloat(price) : price;
    const stripePrice = await createStripePrice(stripeProduct.id, priceFloat);

    const [newPlan] = await db.insert(plans).values({
      name,
      price: price.toString(),
      maxStorageMb: parseInt(quota),
      durationDays: dur ? parseInt(dur) : 30,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id
    }).returning();

    // 3. Announcement System - Create Plan
    // Target: All users
    const title = 'New Plan Available';
    const message = `A new subscription plan “${newPlan.name}” is now available. Check it out!`;

    await db.insert(planAnnouncements).values({
      planId: newPlan.id,
      action: 'created',
      title,
      message,
      targetUserIds: null, // null denotes all users
    });

    // Send email to all active users in background
    (async () => {
      try {
        const allActiveUsers = await db
          .select({ email: users.email, username: users.username })
          .from(users)
          .where(eq(users.status, 'active'));

        for (const u of allActiveUsers) {
          await sendPlanAnnouncementEmail(u.email, u.username, title, message);
        }
      } catch (err) {
        console.error('Error dispatching create plan announcement emails:', err);
      }
    })();

    res.status(201).json(newPlan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update plan handler (handles both PUT /:id and PATCH /:id)
const handleUpdatePlan = async (req: any, res: any) => {
  try {
    const planId = parseInt(req.params.id);
    const { name, price, maxStorageMb, storage_quota, durationDays, duration, status } = req.body;

    const quota = maxStorageMb !== undefined ? maxStorageMb : storage_quota;
    const dur = durationDays !== undefined ? durationDays : duration;

    const [existingPlan] = await db.select().from(plans).where(eq(plans.id, planId));
    if (!existingPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Detect changed fields for announcement
    const changedFields: string[] = [];
    if (name !== undefined && name.trim() !== '' && name !== existingPlan.name) {
      changedFields.push(`Name (from "${existingPlan.name}" to "${name}")`);
    }
    if (price !== undefined && parseFloat(price).toFixed(2) !== parseFloat(existingPlan.price).toFixed(2)) {
      changedFields.push(`Price (from $${parseFloat(existingPlan.price).toFixed(2)} to $${parseFloat(price).toFixed(2)})`);
    }
    const parsedQuota = quota !== undefined ? parseInt(quota) : undefined;
    if (parsedQuota !== undefined && parsedQuota !== existingPlan.maxStorageMb) {
      changedFields.push(`Storage Quota (from ${existingPlan.maxStorageMb}MB to ${parsedQuota}MB)`);
    }
    const parsedDuration = dur !== undefined ? parseInt(dur) : undefined;
    if (parsedDuration !== undefined && parsedDuration !== existingPlan.durationDays) {
      changedFields.push(`Duration (from ${existingPlan.durationDays} days to ${parsedDuration} days)`);
    }

    // Update Stripe price if price changed and product exists
    let stripePriceId = existingPlan.stripePriceId;
    if (price !== undefined && parseFloat(price).toFixed(2) !== parseFloat(existingPlan.price).toFixed(2) && existingPlan.stripeProductId) {
      try {
        const priceFloat = typeof price === 'string' ? parseFloat(price) : price;
        const newStripePrice = await createStripePrice(existingPlan.stripeProductId, priceFloat);
        stripePriceId = newStripePrice.id;
      } catch (stripeErr) {
        console.warn('Could not create updated Stripe price:', stripeErr);
      }
    }

    const [updatedPlan] = await db.update(plans).set({
      name: name !== undefined ? name : undefined,
      price: price !== undefined ? price.toString() : undefined,
      maxStorageMb: parsedQuota !== undefined ? parsedQuota : undefined,
      durationDays: parsedDuration !== undefined ? parsedDuration : undefined,
      status: status !== undefined ? status : undefined,
      stripePriceId: stripePriceId || undefined,
      updatedAt: new Date()
    })
    .where(eq(plans.id, planId))
    .returning();

    // Announcement System - Edit Plan
    // Only current subscribers of this plan receive the announcement
    if (changedFields.length > 0) {
      (async () => {
        try {
          const subscribers = await db
            .select({
              userId: activeSubscriptions.userId,
              usedStorageMb: activeSubscriptions.usedStorageMb,
              email: users.email,
              username: users.username,
            })
            .from(activeSubscriptions)
            .innerJoin(users, eq(users.id, activeSubscriptions.userId))
            .where(
              and(
                eq(activeSubscriptions.planId, planId),
                eq(activeSubscriptions.status, 'ACTIVE'),
                eq(users.status, 'active')
              )
            );

          if (subscribers.length > 0) {
            const targetUserIds = Array.from(new Set(subscribers.map(s => s.userId)));
            const title = 'Plan Updated';
            const baseMessage = `Your current plan “${updatedPlan.name}” has been updated.\nChanges: ${changedFields.join(', ')}.\nPlease review your subscription.`;

            await db.insert(planAnnouncements).values({
              planId: updatedPlan.id,
              action: 'edited',
              title,
              message: baseMessage,
              targetUserIds,
            });

            // Send emails to subscribers
            for (const sub of subscribers) {
              let userEmailMessage = baseMessage;
              const userUsage = parseFloat(sub.usedStorageMb || '0');
              if (parsedQuota !== undefined && userUsage > parsedQuota) {
                userEmailMessage += `\n\nWarning: Your current storage usage exceeds the new quota.\nPlease free up space or upgrade to avoid restrictions.`;
              }
              await sendPlanAnnouncementEmail(sub.email, sub.username, title, userEmailMessage);
            }
          }
        } catch (err) {
          console.error('Error dispatching edit plan announcement:', err);
        }
      })();
    }

    res.json(updatedPlan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/plans/:id & PUT /api/admin/plans/:id
router.put('/:id', authenticate, requireAdmin, handleUpdatePlan);

// PATCH /api/plans/:id & PATCH /api/admin/plans/:id
router.patch('/:id', authenticate, requireAdmin, handleUpdatePlan);

// PATCH /api/plans/:id/deactivate
// Admin only - Deactivate a plan (soft delete)
router.patch('/:id/deactivate', authenticate, requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const [deactivatedPlan] = await db.update(plans).set({
      status: 'INACTIVE',
      updatedAt: new Date()
    })
    .where(eq(plans.id, planId))
    .returning();

    if (!deactivatedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Announcement System - Deactivate Plan
    // Target: Only current subscribers of that plan
    (async () => {
      try {
        const subscribers = await db
          .select({
            userId: activeSubscriptions.userId,
            endDate: activeSubscriptions.endDate,
            currentPeriodEnd: activeSubscriptions.currentPeriodEnd,
            email: users.email,
            username: users.username,
          })
          .from(activeSubscriptions)
          .innerJoin(users, eq(users.id, activeSubscriptions.userId))
          .where(
            and(
              eq(activeSubscriptions.planId, planId),
              eq(activeSubscriptions.status, 'ACTIVE'),
              eq(users.status, 'active')
            )
          );

        if (subscribers.length > 0) {
          const targetUserIds = Array.from(new Set(subscribers.map(s => s.userId)));
          const title = 'Plan Deactivated';
          const storedMessage = `Your plan “${deactivatedPlan.name}” has been deactivated.\nYou will keep full access until {user’s personal end_date}.\nAfter that date you will be moved to the Free plan.`;

          await db.insert(planAnnouncements).values({
            planId: deactivatedPlan.id,
            action: 'deactivated',
            title,
            message: storedMessage,
            targetUserIds,
          });

          // Send personalized emails with their personal end date
          for (const sub of subscribers) {
            let endDateStr = 'the end of your current billing period';
            if (sub.endDate || sub.currentPeriodEnd) {
              const d = new Date(sub.endDate || sub.currentPeriodEnd);
              endDateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }
            const personalizedEmailMessage = storedMessage.replace('{user’s personal end_date}', endDateStr);
            await sendPlanAnnouncementEmail(sub.email, sub.username, title, personalizedEmailMessage);
          }
        }
      } catch (err) {
        console.error('Error dispatching deactivate plan announcement:', err);
      }
    })();

    res.json({ message: 'Plan deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/plans/:id/activate
// Admin only - Activate a plan
router.patch('/:id/activate', authenticate, requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const [activatedPlan] = await db.update(plans).set({
      status: 'ACTIVE',
      updatedAt: new Date()
    })
    .where(eq(plans.id, planId))
    .returning();

    if (!activatedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Announcement System - Activate Plan
    // Target: Only users currently subscribed to that plan
    (async () => {
      try {
        const subscribers = await db
          .select({
            userId: activeSubscriptions.userId,
            email: users.email,
            username: users.username,
          })
          .from(activeSubscriptions)
          .innerJoin(users, eq(users.id, activeSubscriptions.userId))
          .where(
            and(
              eq(activeSubscriptions.planId, planId),
              eq(activeSubscriptions.status, 'ACTIVE'),
              eq(users.status, 'active')
            )
          );

        if (subscribers.length > 0) {
          const targetUserIds = Array.from(new Set(subscribers.map(s => s.userId)));
          const title = 'Plan Reactivated';
          const message = `Your plan “${activatedPlan.name}” has been reactivated.`;

          await db.insert(planAnnouncements).values({
            planId: activatedPlan.id,
            action: 'activated',
            title,
            message,
            targetUserIds,
          });

          for (const sub of subscribers) {
            await sendPlanAnnouncementEmail(sub.email, sub.username, title, message);
          }
        }
      } catch (err) {
        console.error('Error dispatching activate plan announcement:', err);
      }
    })();

    res.json({ message: 'Plan activated successfully' });
  } catch (error) {
    console.error('Error activating plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/plans/:id
// Admin only - Delete a plan (blocked if active subscribers exist)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);

    // Check if plan has active subscribers
    const [subCountResult] = await db
      .select({ count: count() })
      .from(activeSubscriptions)
      .where(and(eq(activeSubscriptions.planId, planId), eq(activeSubscriptions.status, 'ACTIVE')));

    const activeCount = Number(subCountResult?.count || 0);
    if (activeCount > 0) {
      return res.status(409).json({
        error: `This plan has ${activeCount} active subscriber(s). You cannot delete it while users are subscribed. Would you like to deactivate the plan instead?`,
        activeSubscribers: activeCount,
        canDeactivate: true,
      });
    }

    const [deletedPlan] = await db.delete(plans)
      .where(eq(plans.id, planId))
      .returning();

    if (!deletedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Announcement System - Delete Plan
    // Target: All users
    (async () => {
      try {
        const title = 'Plan Removed';
        const message = `The plan “${deletedPlan.name}” has been removed from our offerings.`;

        await db.insert(planAnnouncements).values({
          planId: null,
          action: 'deleted',
          title,
          message,
          targetUserIds: null, // all users
        });

        const allActiveUsers = await db
          .select({ email: users.email, username: users.username })
          .from(users)
          .where(eq(users.status, 'active'));

        for (const u of allActiveUsers) {
          await sendPlanAnnouncementEmail(u.email, u.username, title, message);
        }
      } catch (err) {
        console.error('Error dispatching delete plan announcement:', err);
      }
    })();

    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
