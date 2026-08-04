import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/infrastructure/db/prisma";
import { logger } from "@/shared/lib/logger";

/**
 * Audit logging (OWASP A09). Best-effort: an audit failure must never break
 * the business action, but it is always logged.
 */
export const AUDIT_ACTIONS = {
  LOGIN: "auth.login",
  LOGIN_FAILED: "auth.login_failed",
  LOGOUT: "auth.logout",
  LOCKOUT: "auth.lockout",
  SIGNUP: "auth.signup",
  PASSWORD_CHANGED: "auth.password_changed",
  PASSWORD_RESET_REQUESTED: "auth.password_reset_requested",
  PASSWORD_RESET_COMPLETED: "auth.password_reset_completed",
  EMAIL_VERIFIED: "auth.email_verified",
  USER_CREATED: "users.created",
  USER_UPDATED: "users.updated",
  USER_ROLE_CHANGED: "users.role_changed",
  USER_SUSPENDED: "users.suspended",
  USER_REACTIVATED: "users.reactivated",
  USER_REMOVED: "users.removed",
  VERIFICATION_SUBMITTED: "verification.submitted",
  VERIFICATION_REVIEWED: "verification.reviewed",
  ACCOUNT_SUSPENDED: "accounts.suspended",
  ACCOUNT_REACTIVATED: "accounts.reactivated",
  SUBSCRIPTION_CHANGED: "billing.subscription_changed",
  TAX_PROFILE_CHANGED: "settings.tax_profile_changed",
  QUOTE_REQUEST_SENT: "marketplace.quote_request_sent",
  QUOTE_SENT: "quotes.quote_sent",
  BOOKING_CONFIRMED: "quotes.booking_confirmed",
  LEAD_LOST: "leads.marked_lost",
  LEAD_CANCELLED: "leads.cancelled",
  LEAD_REOPENED: "leads.reopened",
  LEADS_IMPORTED: "leads.imported",
  LEADS_IMPORT_UNDONE: "leads.import_undone",
  LISTING_UPDATED: "listings.updated",
  DISPUTE_UPDATED: "disputes.updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export async function recordAudit(entry: {
  action: AuditAction;
  actorUserId?: string | null;
  accountId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const h = await headers().catch(() => null);
    const ipAddress = h?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = h?.get("user-agent")?.slice(0, 255) ?? null;

    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorUserId: entry.actorUserId ?? null,
        accountId: entry.accountId ?? null,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ipAddress,
        userAgent,
        metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined,
      },
    });
  } catch (error) {
    logger.error("audit_log_write_failed", {
      action: entry.action,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
