import { Request, Response } from 'express';
import { stripe } from '../../services/stripe.service.js';
import * as webhooksService from './webhooks.service.js';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (!endpointSecret) throw new Error('Stripe Webhook Secret not configured');
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const stripeSubscriptionId = subscription.id;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        let status = 'ACTIVE';

        if (subscription.status === 'canceled') status = 'CANCELED';
        else if (subscription.status === 'past_due') status = 'PAST_DUE';
        else if (subscription.status === 'incomplete') status = 'INCOMPLETE';
        else if (subscription.status === 'trialing') status = 'TRIALING';
        else if (subscription.status !== 'active') status = 'EXPIRED';

        await webhooksService.updateSubscriptionFromWebhook(
          stripeSubscriptionId,
          status,
          currentPeriodEnd
        );
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
