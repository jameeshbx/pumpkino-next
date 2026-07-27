import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton. All queries go through Prisma's parameterised
 * query builder — no raw SQL anywhere in the codebase (SQLi protection).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
