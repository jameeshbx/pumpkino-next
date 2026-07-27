import "server-only";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Dummy hash used to equalise timing when the user doesn't exist
 * (prevents user-enumeration via response-time differences).
 */
const DUMMY_HASH = "$2a$12$X9h1yqFZbFyXhfWm0oXY7eBQZBEnYYRuP0lIN5dWPFtRLkR3rE7NW";

export async function verifyAgainstDummy(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}
