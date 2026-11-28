import { db } from '../../database/index.js';
import { users } from '../../database/schema.js';
import { eq } from 'drizzle-orm';

export async function findAdminByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()));
  return result[0] || null;
}
