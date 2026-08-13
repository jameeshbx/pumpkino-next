import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { RateLimitError } from "@/domain/errors";

/**
 * DB-backed fixed-window rate limiter.
 *
 * Works with zero extra infrastructure in development and single-region
 * production. For multi-region / high-traffic deployments, swap this module
 * for a Redis implementation with the same signature.
 */
export interface RateLimitRule {
  /** Logical name, e.g. "login" — becomes part of the bucket key. */
  name: string;
  /** Max attempts per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export const RATE_LIMITS = {
  login: { name: "login", limit: 10, windowSeconds: 15 * 60 },
  signup: { name: "signup", limit: 5, windowSeconds: 60 * 60 },
  passwordReset: { name: "pwreset", limit: 5, windowSeconds: 60 * 60 },
  supportContact: { name: "support", limit: 5, windowSeconds: 60 * 60 },
  publicApi: { name: "api", limit: 100, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Consumes one attempt. Throws RateLimitError when the bucket is exhausted.
 */
export async function consumeRateLimit(rule: RateLimitRule, identifier: string): Promise<void> {
  const key = `${rule.name}:${identifier}`;
  const now = new Date();
  const resetsAt = new Date(now.getTime() + rule.windowSeconds * 1000);

  const bucket = await prisma.rateLimitBucket.upsert({
    where: { key },
    create: { key, count: 1, resetsAt },
    update: { count: { increment: 1 } },
  });

  // Expired window → start a fresh one.
  if (bucket.resetsAt < now) {
    await prisma.rateLimitBucket.update({
      where: { key },
      data: { count: 1, resetsAt },
    });
    return;
  }

  if (bucket.count > rule.limit) {
    throw new RateLimitError();
  }
}

/** Housekeeping helper (called opportunistically; safe to run any time). */
export async function pruneExpiredBuckets(): Promise<void> {
  await prisma.rateLimitBucket.deleteMany({ where: { resetsAt: { lt: new Date() } } });
}
