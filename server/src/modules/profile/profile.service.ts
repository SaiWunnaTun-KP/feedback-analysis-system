import { db } from '../../database/index.js';
import { users, verificationCodes } from '../../database/schema.js';
import { eq, and, gt } from 'drizzle-orm';

export async function findUserById(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user || null;
}

export async function updateUserProfile(userId: number, username: string, companyName: string) {
  const [updatedUser] = await db
    .update(users)
    .set({
      username,
      companyName,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return updatedUser;
}

export async function createVerificationCode(userId: number, codeHash: string, expiresAt: Date) {
  await db.insert(verificationCodes).values({
    userId,
    codeHash,
    expiresAt,
  });
}

export async function findValidVerificationCodes(userId: number) {
  return db
    .select()
    .from(verificationCodes)
    .where(and(eq(verificationCodes.userId, userId), gt(verificationCodes.expiresAt, new Date())))
    .orderBy(verificationCodes.createdAt);
}

export async function storeResetTokenHash(verificationCodeId: number, resetTokenHash: string) {
  await db
    .update(verificationCodes)
    .set({
      codeHash: null,
      resetTokenHash,
    })
    .where(eq(verificationCodes.id, verificationCodeId));
}

export async function deleteVerificationCode(verificationCodeId: number) {
  await db.delete(verificationCodes).where(eq(verificationCodes.id, verificationCodeId));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function deleteUserById(userId: number) {
  await db.delete(users).where(eq(users.id, userId));
}
