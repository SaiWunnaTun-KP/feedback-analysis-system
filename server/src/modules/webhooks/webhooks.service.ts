import { db } from '../../database/index.js';
import { activeSubscriptions } from '../../database/schema.js';
import { eq } from 'drizzle-orm';

export async function updateSubscriptionFromWebhook(
  stripeSubscriptionId: string,
  status: string,
  currentPeriodEnd: Date
) {
  const [existingSub] = await db
    .select()
    .from(activeSubscriptions)
    .where(eq(activeSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

  if (existingSub) {
    await db
      .update(activeSubscriptions)
      .set({
        status: status as any,
        currentPeriodEnd,
        endDate: currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(activeSubscriptions.id, existingSub.id));
  }
}
