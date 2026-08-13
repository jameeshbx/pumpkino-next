import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import type { SupportContactInput } from "@/features/support/schemas";

export async function submitSupportMessage(input: SupportContactInput): Promise<void> {
  await prisma.supportMessage.create({ data: input });
}
