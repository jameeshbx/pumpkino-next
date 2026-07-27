import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/db/prisma";

/**
 * Atomic document ID generation (PRD Section 3): PMK-Q-{year}-{5-digit seq},
 * PMK-B-…, PMK-INV-…. Uses a per-(kind, year) row with an atomic increment so
 * two concurrent writers can never collide.
 */
type SequenceKind = "QUOTE" | "BOOKING" | "INVOICE";

const PREFIX: Record<SequenceKind, string> = {
  QUOTE: "PMK-Q",
  BOOKING: "PMK-B",
  INVOICE: "PMK-INV",
};

export async function nextDocumentId(
  kind: SequenceKind,
  tx: Prisma.TransactionClient = prisma,
): Promise<string> {
  const year = new Date().getFullYear();
  const row = await tx.documentSequence.upsert({
    where: { kind_year: { kind, year } },
    create: { kind, year, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${PREFIX[kind]}-${year}-${String(row.value).padStart(5, "0")}`;
}
