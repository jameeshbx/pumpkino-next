import "server-only";
import type { Prisma } from "@prisma/client";
import type { AuthContext } from "@/application/auth/session";
import { leadScopeWhere } from "@/application/leads/lead-scope";
import { prisma } from "@/infrastructure/db/prisma";
import { NotFoundError } from "@/domain/errors";

export interface ItineraryDayInput {
  title: string;
  description: string;
}

/**
 * Manual itinerary content (PRD's "AI Itinerary Builder" — this is the
 * foundation: real AI generation writes into the same `days`/`overview`/
 * `hotel*` shape with source AI_DRAFT instead of MANUAL, so the editor UI
 * needs zero changes to display an AI draft, per the AI Assistant Plan.
 */
export async function upsertItinerary(
  ctx: AuthContext,
  input: {
    leadId: string;
    overview: string;
    hotelName: string;
    hotelCategory: string;
    days: ItineraryDayInput[];
  },
): Promise<void> {
  const where = await leadScopeWhere(ctx);
  const lead = await prisma.lead.findFirst({ where: { ...where, id: input.leadId } });
  if (!lead) throw new NotFoundError("Lead");

  await prisma.itinerary.upsert({
    where: { leadId: input.leadId },
    create: {
      leadId: input.leadId,
      overview: input.overview || null,
      hotelName: input.hotelName || null,
      hotelCategory: input.hotelCategory || null,
      days: input.days as unknown as Prisma.InputJsonValue,
      source: "MANUAL",
    },
    update: {
      overview: input.overview || null,
      hotelName: input.hotelName || null,
      hotelCategory: input.hotelCategory || null,
      days: input.days as unknown as Prisma.InputJsonValue,
    },
  });
}
