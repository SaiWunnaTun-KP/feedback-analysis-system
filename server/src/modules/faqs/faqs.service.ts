import { db } from '../../database/index.js';
import { faqs } from '../../database/schema.js';
import { eq, asc, count, or, ilike } from 'drizzle-orm';

export async function listPublicFaqs() {
  return db
    .select({
      id: faqs.faqId,
      faqId: faqs.faqId,
      question: faqs.question,
      answer: faqs.answer,
      sortOrder: faqs.sortOrder,
      createdAt: faqs.createdAt,
    })
    .from(faqs)
    .where(eq(faqs.isVisible, true))
    .orderBy(asc(faqs.sortOrder), asc(faqs.faqId));
}

export async function listAdminFaqsPaginated(search?: string, limit?: number, offset?: number) {
  let whereClause = undefined;
  if (search) {
    const searchTerm = `%${search}%`;
    whereClause = or(ilike(faqs.question, searchTerm), ilike(faqs.answer, searchTerm));
  }

  const countQuery = db.select({ total: count() }).from(faqs);
  if (whereClause) {
    countQuery.where(whereClause);
  }
  const [totalResult] = await countQuery;
  const total = Number(totalResult?.total || 0);

  const dataQuery = db.select().from(faqs);
  if (whereClause) {
    dataQuery.where(whereClause);
  }
  const ordered = dataQuery.orderBy(asc(faqs.sortOrder), asc(faqs.faqId));
  const data =
    limit !== undefined && offset !== undefined ? await ordered.limit(limit).offset(offset) : await ordered;

  return { data, total };
}

export async function listAllAdminFaqs() {
  return db.select().from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.faqId));
}

export async function findFaqById(faqId: number) {
  const result = await db.select().from(faqs).where(eq(faqs.faqId, faqId));
  return result[0] || null;
}

export async function createFaqRecord(data: {
  question: string;
  answer: string;
  sortOrder: number;
  isVisible: boolean;
}) {
  const [newFaq] = await db
    .insert(faqs)
    .values({
      question: data.question,
      answer: data.answer,
      sortOrder: data.sortOrder,
      isVisible: data.isVisible,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return newFaq;
}

export async function updateFaqRecord(
  faqId: number,
  updates: {
    question?: string;
    answer?: string;
    sortOrder?: number;
    isVisible?: boolean;
  }
) {
  const [updatedFaq] = await db
    .update(faqs)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(faqs.faqId, faqId))
    .returning();
  return updatedFaq || null;
}

export async function deleteFaqRecord(faqId: number) {
  const [deletedFaq] = await db.delete(faqs).where(eq(faqs.faqId, faqId)).returning();
  return deletedFaq || null;
}
