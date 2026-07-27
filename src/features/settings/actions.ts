"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/db/prisma";
import { requirePermission } from "@/application/auth/session";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { ValidationError } from "@/domain/errors";
import { taxSettingsSchema, type TaxSettingsInput } from "@/features/settings/schemas";
import { actionOk, toActionError, type ActionResult } from "@/shared/lib/action-result";
import { logger } from "@/shared/lib/logger";

export async function updateTaxSettingsAction(
  input: TaxSettingsInput,
): Promise<ActionResult<undefined>> {
  try {
    const ctx = await requirePermission("settings:manage");
    if (!ctx.accountId) throw new ValidationError("No business account attached to this user.");
    const parsed = taxSettingsSchema.parse(input);

    await prisma.account.update({
      where: { id: ctx.accountId },
      data: {
        taxSchemeKey: parsed.schemeKey,
        taxRate: parsed.rate,
        taxAppliesTo: parsed.appliesTo,
      },
    });

    await recordAudit({
      action: AUDIT_ACTIONS.TAX_PROFILE_CHANGED,
      actorUserId: ctx.userId,
      accountId: ctx.accountId,
      metadata: { schemeKey: parsed.schemeKey, rate: parsed.rate, appliesTo: parsed.appliesTo },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dmc/settings");
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("update_tax_settings_failed", { error: String(e) }),
    );
  }
}
