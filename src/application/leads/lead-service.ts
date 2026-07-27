import "server-only";
import type { InitiatedBy, Lead, LostReason, RefundStatus } from "@prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { NotFoundError, ValidationError } from "@/domain/errors";
import {
  LEAD_CANCELLABLE_STAGES,
  LEAD_LOSABLE_STAGES,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  cancelReasonFor,
  initialRefundStatus,
  reopenNeedsConfirmation,
} from "@/domain/pipeline/lifecycle";
import type { AuthContext } from "@/application/auth/session";
import { leadScopeWhere } from "@/application/leads/lead-scope";

/** Loads a lead only if it's inside the actor's visibility scope. */
async function scopedLead(ctx: AuthContext, leadId: string): Promise<Lead> {
  const where = await leadScopeWhere(ctx);
  const lead = await prisma.lead.findFirst({ where: { ...where, id: leadId } });
  if (!lead) throw new NotFoundError("Lead");
  return lead;
}

export async function createLead(
  ctx: AuthContext,
  input: {
    name: string;
    destination: string;
    pax?: string;
    mobile?: string;
    email?: string;
    startDate?: string;
    assignedToId?: string;
  },
): Promise<Lead> {
  if (input.assignedToId) {
    const assignee = await prisma.user.findFirst({
      where: { id: input.assignedToId, accountId: ctx.accountId!, status: "ACTIVE" },
    });
    if (!assignee) throw new ValidationError("Pick an active teammate to assign this lead to.");
  }

  const lead = await prisma.lead.create({
    data: {
      accountId: ctx.accountId!,
      name: input.name,
      destination: input.destination,
      pax: input.pax || null,
      mobile: input.mobile || null,
      email: input.email || null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      assignedToId: input.assignedToId || null,
      createdById: ctx.userId,
      activities: {
        create: { type: "created", message: "Lead created", actorName: ctx.name },
      },
    },
  });
  return lead;
}

export async function advanceLeadStage(ctx: AuthContext, leadId: string): Promise<Lead> {
  const lead = await scopedLead(ctx, leadId);
  if (lead.lifecycleStatus !== "ACTIVE") {
    throw new ValidationError("Reopen this lead before moving it through the pipeline.");
  }
  const index = LEAD_STAGES.indexOf(lead.stage);
  const next = LEAD_STAGES[index + 1];
  if (!next) throw new ValidationError("This lead is already booked and fully paid.");

  return prisma.lead.update({
    where: { id: lead.id },
    data: {
      stage: next,
      activities: {
        create: {
          type: "stage_changed",
          message: `Moved to “${LEAD_STAGE_LABELS[next]}”`,
          actorName: ctx.name,
        },
      },
    },
  });
}

export async function markLeadLost(
  ctx: AuthContext,
  input: { leadId: string; reason: LostReason; initiatedBy: InitiatedBy },
): Promise<void> {
  const lead = await scopedLead(ctx, input.leadId);
  if (lead.lifecycleStatus !== "ACTIVE") throw new ValidationError("This lead already left the pipeline.");
  if (!LEAD_LOSABLE_STAGES.includes(lead.stage)) {
    throw new ValidationError(
      "Money is involved at this stage — use “Cancel booking” instead of marking it lost.",
    );
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      lifecycleStatus: "LOST",
      exitedAtStage: lead.stage,
      lostReason: input.reason,
      initiatedBy: input.initiatedBy,
      paymentStateAtExit: "NONE",
      refundStatus: "NOT_APPLICABLE",
      activities: {
        create: {
          type: "marked_lost",
          message: `Marked lost (${input.reason.toLowerCase().replaceAll("_", " ")}) at stage “${LEAD_STAGE_LABELS[lead.stage]}”`,
          actorName: ctx.name,
        },
      },
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.LEAD_LOST,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "Lead",
    entityId: lead.id,
    metadata: { reason: input.reason, exitedAtStage: lead.stage },
  });
}

export async function cancelLeadBooking(
  ctx: AuthContext,
  input: { leadId: string; initiatedBy: InitiatedBy },
): Promise<{ refundStatus: RefundStatus }> {
  const lead = await scopedLead(ctx, input.leadId);
  if (lead.lifecycleStatus !== "ACTIVE") throw new ValidationError("This lead already left the pipeline.");
  if (!LEAD_CANCELLABLE_STAGES.includes(lead.stage)) {
    throw new ValidationError("Nothing has been paid yet — use “Mark lost” instead.");
  }

  // Assumption (stated in README): without granular payment records in this
  // phase, PAYMENT stage ⇒ advance paid, DONE stage ⇒ fully paid.
  const paymentState = lead.stage === "DONE" ? "FULLY_PAID" : "ADVANCE_PAID";
  const refundStatus = initialRefundStatus(paymentState);

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      lifecycleStatus: "CANCELLED",
      exitedAtStage: lead.stage,
      cancelReason: cancelReasonFor(paymentState),
      initiatedBy: input.initiatedBy,
      paymentStateAtExit: paymentState,
      refundStatus,
      activities: {
        create: {
          type: "cancelled",
          message: `Booking cancelled at stage “${LEAD_STAGE_LABELS[lead.stage]}” — refund ${refundStatus.toLowerCase()}`,
          actorName: ctx.name,
        },
      },
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.LEAD_CANCELLED,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "Lead",
    entityId: lead.id,
    metadata: { exitedAtStage: lead.stage, paymentState },
  });

  return { refundStatus };
}

export async function reopenLead(
  ctx: AuthContext,
  input: { leadId: string; confirmedRefundWarning: boolean },
): Promise<{ needsConfirmation: boolean }> {
  const lead = await scopedLead(ctx, input.leadId);
  if (lead.lifecycleStatus === "ACTIVE") throw new ValidationError("This lead is already active.");

  // Money-safety gate (PRD): a processed refund can't be auto-reversed.
  if (
    reopenNeedsConfirmation(lead.lifecycleStatus, lead.refundStatus) &&
    !input.confirmedRefundWarning
  ) {
    return { needsConfirmation: true };
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      lifecycleStatus: "ACTIVE",
      stage: lead.exitedAtStage ?? lead.stage,
      exitedAtStage: null,
      lostReason: null,
      cancelReason: null,
      initiatedBy: null,
      paymentStateAtExit: null,
      refundStatus: "NOT_APPLICABLE",
      activities: {
        create: {
          type: "reopened",
          message: `Reopened to “${LEAD_STAGE_LABELS[lead.exitedAtStage ?? lead.stage]}” (refund status at the time: ${lead.refundStatus.toLowerCase()})`,
          actorName: ctx.name,
        },
      },
    },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.LEAD_REOPENED,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "Lead",
    entityId: lead.id,
    metadata: { refundStatusAtReopen: lead.refundStatus },
  });

  return { needsConfirmation: false };
}

export async function setLeadRefundStatus(
  ctx: AuthContext,
  input: { leadId: string; refundStatus: Extract<RefundStatus, "PENDING" | "PROCESSED" | "DENIED"> },
): Promise<void> {
  const lead = await scopedLead(ctx, input.leadId);
  if (lead.lifecycleStatus !== "CANCELLED" || lead.paymentStateAtExit === "NONE") {
    throw new ValidationError("Refund tracking only applies to cancelled bookings with payments.");
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      refundStatus: input.refundStatus,
      activities: {
        create: {
          type: "refund_updated",
          message: `Refund marked ${input.refundStatus.toLowerCase()}`,
          actorName: ctx.name,
        },
      },
    },
  });
}
