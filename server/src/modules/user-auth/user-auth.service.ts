import { db } from '../../database/index.js';
import { users, verificationCodes } from '../../database/schema.js';
import { eq, and, gt } from 'drizzle-orm';

export async function findUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  return result[0] || null;
}

export async function createRetailManagerUser(data: {
  username: string;
  email: string;
  passwordHash: string;
  companyName: string;
  companyEmail: string;
}) {
  const [newUser] = await db
    .insert(users)
    .values({
      username: data.username,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      companyName: data.companyName,
      companyEmail: data.companyEmail,
      role: 'RETAIL_MANAGER',
    })
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
    });
  return newUser;
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
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
