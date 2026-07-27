import "server-only";
import { prisma } from "@/infrastructure/db/prisma";
import { hashPassword } from "@/infrastructure/auth/password";
import { generateToken, EMAIL_VERIFICATION_TTL_MS } from "@/infrastructure/auth/tokens";
import { mailer } from "@/infrastructure/email/mailer";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { ConflictError } from "@/domain/errors";
import { TRIAL_LENGTH_DAYS, defaultGatewayForCountry } from "@/domain/billing/plans";
import { taxDefaultsForCountry } from "@/domain/billing/tax";
import { env } from "@/shared/lib/env";
import type { SignupInput } from "@/features/authentication/schemas";

/**
 * Signup use case (PRD "Signup → active account"):
 * the account is created fully active immediately — trial for agencies, free
 * for DMCs. Email verification is issued but never blocks access.
 * Verification (business docs) is a separate, optional flow.
 */
export async function signup(input: SignupInput): Promise<{ userId: string }> {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  const existingAccount = await prisma.account.findUnique({ where: { email: input.email } });
  if (existingUser || existingAccount) {
    // Deliberately vague to reduce enumeration value; rate limiting narrows
    // the attack further.
    throw new ConflictError("An account with this email already exists. Try logging in instead.");
  }

  const isAgency = input.role === "agency";
  const passwordHash = await hashPassword(input.password);
  const { gateway } = defaultGatewayForCountry(input.country);
  const taxDefault = taxDefaultsForCountry(input.country)[0];

  const roleKey = isAgency ? "AGENCY_OWNER" : "DMC_OWNER";
  const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey } });

  const { user, rawToken } = await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        type: isAgency ? "AGENCY" : "DMC",
        name: input.companyName,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        city: input.city,
        state: input.state || null,
        country: input.country,
        plan: isAgency ? "TRIAL" : "FREE",
        trialEndsAt: isAgency
          ? new Date(Date.now() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000)
          : null,
        gateway,
        taxSchemeKey: taxDefault?.schemeKey ?? null,
        taxRate: taxDefault?.rate ?? null,
        taxAppliesTo: taxDefault?.appliesTo ?? null,
      },
    });

    const createdUser = await tx.user.create({
      data: {
        accountId: account.id,
        name: input.contactName,
        email: input.email,
        passwordHash,
        roles: { create: { roleId: role.id } },
      },
    });

    const { raw, hash } = generateToken();
    await tx.emailVerificationToken.create({
      data: {
        userId: createdUser.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });

    return { user: createdUser, rawToken: raw };
  });

  await mailer.send({
    to: input.email,
    subject: "Verify your Pumpkino email",
    text: `Welcome to Pumpkino! Confirm your email: ${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${rawToken}\n\nVerifying your email doesn't block anything — your account is already active.`,
  });

  await recordAudit({
    action: AUDIT_ACTIONS.SIGNUP,
    actorUserId: user.id,
    accountId: user.accountId,
    metadata: { role: input.role, country: input.country },
  });

  return { userId: user.id };
}
