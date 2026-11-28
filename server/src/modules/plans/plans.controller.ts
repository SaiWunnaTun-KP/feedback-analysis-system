import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware.js';
import { createStripeProduct, createStripePrice } from '../../services/stripe.service.js';
import { sendPlanAnnouncementEmail } from '../../services/emailService.js';
import * as plansService from './plans.service.js';

export async function getPlans(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role === 'ADMIN') {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = req.query.search ? (req.query.search as string).trim() : undefined;

      if (page !== undefined || limit !== undefined || search !== undefined) {
        const currentPage = Math.max(1, page || 1);
        const pageSize = Math.max(1, limit || 10);
        const offset = (currentPage - 1) * pageSize;

        const { plans: pagedPlans, total } = await plansService.listPlansPaginated(search, pageSize, offset);
        const countMap = await plansService.getActiveSubscribersCountMap();

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

      const allPlans = await plansService.listAllPlans();
      const countMap = await plansService.getActiveSubscribersCountMap();

      const plansWithSubscribers = allPlans.map((p) => ({
        ...p,
        activeSubscribers: countMap.get(p.id) || 0,
      }));

      return res.json(plansWithSubscribers);
    }

    const activePlans = await plansService.listActivePlansPublic();
    return res.json(activePlans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createPlan(req: Request, res: Response) {
  try {
    const { name, price, maxStorageMb, storage_quota, durationDays, duration } = req.body;

    const quota = maxStorageMb !== undefined ? maxStorageMb : storage_quota;
    const dur = durationDays !== undefined ? durationDays : duration;

    if (!name || price === undefined || !quota) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stripeProduct = await createStripeProduct(name, `Storage: ${quota}MB`);
    const priceFloat = typeof price === 'string' ? parseFloat(price) : price;
    const stripePrice = await createStripePrice(stripeProduct.id, priceFloat);

    const newPlan = await plansService.createPlanRecord({
      name,
      price: price.toString(),
      maxStorageMb: parseInt(quota),
      durationDays: dur ? parseInt(dur) : 30,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
    });

    const title = 'New Plan Available';
    const message = `A new subscription plan “${newPlan.name}” is now available. Check it out!`;

    await plansService.createPlanAnnouncement({
      planId: newPlan.id,
      action: 'created',
      title,
      message,
      targetUserIds: null,
    });

    (async () => {
      try {
        const allActiveUsers = await plansService.getAllActiveRetailManagers();
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
}

export async function updatePlan(req: Request, res: Response) {
  try {
    const planId = parseInt(String(req.params.id));
    const { name, price, maxStorageMb, storage_quota, durationDays, duration, status } = req.body;

    const quota = maxStorageMb !== undefined ? maxStorageMb : storage_quota;
    const dur = durationDays !== undefined ? durationDays : duration;

    const existingPlan = await plansService.findPlanById(planId);
    if (!existingPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

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

    let stripePriceId = existingPlan.stripePriceId;
    if (
      price !== undefined &&
      parseFloat(price).toFixed(2) !== parseFloat(existingPlan.price).toFixed(2) &&
      existingPlan.stripeProductId
    ) {
      try {
        const priceFloat = typeof price === 'string' ? parseFloat(price) : price;
        const newStripePrice = await createStripePrice(existingPlan.stripeProductId, priceFloat);
        stripePriceId = newStripePrice.id;
      } catch (stripeErr) {
        console.warn('Could not create updated Stripe price:', stripeErr);
      }
    }

    const updatedPlan = await plansService.updatePlanRecord(planId, {
      name: name !== undefined ? name : undefined,
      price: price !== undefined ? price.toString() : undefined,
      maxStorageMb: parsedQuota,
      durationDays: parsedDuration,
      status: status !== undefined ? status : undefined,
      stripePriceId: stripePriceId || undefined,
    });

    if (changedFields.length > 0 && updatedPlan) {
      (async () => {
        try {
          const subscribers = await plansService.getActiveSubscribersForPlan(planId);
          if (subscribers.length > 0) {
            const targetUserIds = Array.from(new Set(subscribers.map((s) => s.userId)));
            const title = 'Plan Updated';
            const baseMessage = `Your current plan “${updatedPlan.name}” has been updated.\nChanges: ${changedFields.join(', ')}.\nPlease review your subscription.`;

            await plansService.createPlanAnnouncement({
              planId: updatedPlan.id,
              action: 'edited',
              title,
              message: baseMessage,
              targetUserIds,
            });

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
}

export async function deactivatePlan(req: Request, res: Response) {
  try {
    const planId = parseInt(String(req.params.id));
    const deactivatedPlan = await plansService.setPlanStatus(planId, 'INACTIVE');

    if (!deactivatedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    (async () => {
      try {
        const subscribers = await plansService.getActiveSubscribersForPlan(planId);
        if (subscribers.length > 0) {
          const targetUserIds = Array.from(new Set(subscribers.map((s) => s.userId)));
          const title = 'Plan Deactivated';
          const storedMessage = `Your plan “${deactivatedPlan.name}” has been deactivated.\nYou will keep full access until {user’s personal end_date}.\nAfter that date you will be moved to the Free plan.`;

          await plansService.createPlanAnnouncement({
            planId: deactivatedPlan.id,
            action: 'deactivated',
            title,
            message: storedMessage,
            targetUserIds,
          });

          for (const sub of subscribers) {
            let endDateStr = 'the end of your current billing period';
            if (sub.endDate || sub.currentPeriodEnd) {
              const d = new Date((sub.endDate || sub.currentPeriodEnd)!);
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
}

export async function activatePlan(req: Request, res: Response) {
  try {
    const planId = parseInt(String(req.params.id));
    const activatedPlan = await plansService.setPlanStatus(planId, 'ACTIVE');

    if (!activatedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    (async () => {
      try {
        const subscribers = await plansService.getActiveSubscribersForPlan(planId);
        if (subscribers.length > 0) {
          const targetUserIds = Array.from(new Set(subscribers.map((s) => s.userId)));
          const title = 'Plan Reactivated';
          const message = `Your plan “${activatedPlan.name}” has been reactivated.`;

          await plansService.createPlanAnnouncement({
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
}

export async function deletePlan(req: Request, res: Response) {
  try {
    const planId = parseInt(String(req.params.id));
    const activeCount = await plansService.countActiveSubscribersForPlan(planId);

    if (activeCount > 0) {
      return res.status(409).json({
        error: `This plan has ${activeCount} active subscriber(s). You cannot delete it while users are subscribed. Would you like to deactivate the plan instead?`,
        activeSubscribers: activeCount,
        canDeactivate: true,
      });
    }

    const deletedPlan = await plansService.deletePlanRecord(planId);
    if (!deletedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    (async () => {
      try {
        const title = 'Plan Removed';
        const message = `The plan “${deletedPlan.name}” has been removed from our offerings.`;

        await plansService.createPlanAnnouncement({
          planId: null,
          action: 'deleted',
          title,
          message,
          targetUserIds: null,
        });

        const allActiveUsers = await plansService.getAllActiveRetailManagers();
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
}
