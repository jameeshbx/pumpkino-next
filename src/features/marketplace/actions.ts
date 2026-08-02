"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/db/prisma";
import { requirePermission } from "@/application/auth/session";
import { marketplaceAccess } from "@/application/marketplace/gate";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { ForbiddenError, NotFoundError, ValidationError } from "@/domain/errors";
import { planCaps } from "@/domain/billing/plans";
import { quoteRequestSchema, type QuoteRequestInput } from "@/features/marketplace/schemas";
import { actionOk, toActionError, type ActionResult } from "@/shared/lib/action-result";
import { logger } from "@/shared/lib/logger";

/**
 * Sends a quote request to a DMC (paid agency plans only — enforced here
 * server-side, not just in the UI). Creates a row in the shared
 * quote_requests table that the DMC portal inbox reads.
 */
export async function sendQuoteRequestAction(
  input: QuoteRequestInput,
): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("marketplace:quote-request");
    const access = marketplaceAccess(ctx);
    if (!access.canSendQuoteRequests) {
      throw new ForbiddenError("Quote requests are available on paid plans. Upgrade to unlock.");
    }

    const parsed = quoteRequestSchema.parse(input);

    const listing = await prisma.dmcListing.findUnique({
      where: { id: parsed.listingId },
      select: { id: true, status: true, accountId: true, name: true },
    });
    if (!listing || listing.status !== "PUBLISHED") throw new NotFoundError("DMC listing");

    const dmcCap = planCaps(ctx.account?.plan ?? "FREE").dmcConnections;
    if (dmcCap !== null && listing.accountId) {
      const connectedDmcIds = await prisma.quoteRequest.findMany({
        where: { agencyAccountId: ctx.accountId! },
        distinct: ["dmcAccountId"],
        select: { dmcAccountId: true },
      });
      const alreadyConnected = connectedDmcIds.some((r) => r.dmcAccountId === listing.accountId);
      if (!alreadyConnected && connectedDmcIds.length >= dmcCap) {
        throw new ValidationError(
          `Your plan allows connecting with ${dmcCap} DMCs. Upgrade to reach more.`,
        );
      }
    }

    await prisma.quoteRequest.create({
      data: {
        agencyAccountId: ctx.accountId!,
        dmcAccountId: listing.accountId,
        listingId: listing.id,
        agentName: ctx.name,
        agencyName: ctx.account?.name ?? "Agency",
        destination: parsed.destination,
        pax: parsed.pax,
        nights: parsed.nights,
        startDate: new Date(parsed.startDate),
        budget: parsed.budget || null,
        message: parsed.message || null,
      },
    });

    await recordAudit({
      action: AUDIT_ACTIONS.QUOTE_REQUEST_SENT,
      actorUserId: ctx.userId,
      accountId: ctx.accountId,
      entityType: "DmcListing",
      entityId: listing.id,
      metadata: { destination: parsed.destination },
    });

    revalidatePath("/dashboard/quote-requests");
    revalidatePath("/dmc/requests");
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("send_quote_request_failed", { error: String(e) }),
    );
  }
}
