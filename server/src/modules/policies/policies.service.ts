import { db } from '../../database/index.js';
import { policies } from '../../database/schema.js';
import { eq } from 'drizzle-orm';

export async function findPolicyByType(type: 'terms' | 'privacy') {
  const existing = await db.select().from(policies).where(eq(policies.type, type));
  return existing[0] || null;
}

export async function createPolicyRecord(data: {
  type: 'terms' | 'privacy';
  title: string;
  content: string;
  version: string;
}) {
  const [created] = await db
    .insert(policies)
    .values({
      type: data.type,
      title: data.title,
      content: data.content,
      version: data.version,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return created;
}

export async function updatePolicyRecord(
  type: 'terms' | 'privacy',
  updateFields: {
    content: string;
    updatedAt: Date;
    updatedBy: number;
    title?: string;
    version?: string;
  }
) {
  const [updated] = await db
    .update(policies)
    .set(updateFields)
    .where(eq(policies.type, type))
    .returning();
  return updated;
}
