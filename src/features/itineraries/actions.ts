"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/application/auth/session";
import { upsertItinerary } from "@/application/itineraries/itinerary-service";
import { upsertItinerarySchema, type UpsertItineraryInput } from "@/features/itineraries/schemas";
import { actionOk, toActionError, type ActionResult } from "@/shared/lib/action-result";
import { logger } from "@/shared/lib/logger";

export async function upsertItineraryAction(
  input: UpsertItineraryInput,
): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("leads:manage");
    const parsed = upsertItinerarySchema.parse(input);

    await upsertItinerary(ctx, {
      leadId: parsed.leadId,
      overview: parsed.overview ?? "",
      hotelName: parsed.hotelName ?? "",
      hotelCategory: parsed.hotelCategory ?? "",
      days: parsed.days.map((d) => ({ title: d.title, description: d.description ?? "" })),
    });

    revalidatePath("/dashboard/leads");
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) => logger.error("upsert_itinerary_failed", { error: String(e) }));
  }
}
