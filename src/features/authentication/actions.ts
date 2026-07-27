"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/infrastructure/auth/auth";
import { consumeRateLimit, RATE_LIMITS } from "@/infrastructure/security/rate-limiter";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { signup } from "@/application/auth/signup";
import { requestPasswordReset, resetPassword } from "@/application/auth/password-reset";
import { changePassword } from "@/application/auth/change-password";
import { verifyEmail } from "@/application/auth/verify-email";
import { getAuthContext } from "@/application/auth/session";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type SignupInput,
} from "@/features/authentication/schemas";
import { actionOk, toActionError, type ActionResult } from "@/shared/lib/action-result";
import { clientIp } from "@/shared/lib/request-ip";
import { logger } from "@/shared/lib/logger";

function homeFor(user: { accountType: string | null; roles: string[] }): string {
  if (user.roles.includes("SUPER_ADMIN") || user.roles.includes("OPS_ADMIN")) return "/admin";
  if (user.accountType === "DMC") return "/dmc";
  return "/dashboard";
}

/** Login. Rate limited per IP and per IP+email; lockout handled in authorize(). */
export async function loginAction(
  input: LoginInput,
  callbackUrl?: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const parsed = loginSchema.parse(input);
    const ip = await clientIp();
    await consumeRateLimit(RATE_LIMITS.login, ip);
    await consumeRateLimit(RATE_LIMITS.login, `${ip}:${parsed.email}`);

    try {
      await signIn("credentials", {
        email: parsed.email,
        password: parsed.password,
        redirect: false,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        // Uniform message — never reveal whether the email exists, whether the
        // password was wrong, or whether the account is locked/suspended.
        return {
          ok: false,
          error: "Invalid email or password, or your account is temporarily locked.",
        };
      }
      throw error;
    }

    const session = await auth();
    const redirectTo =
      callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : session?.user
          ? homeFor(session.user)
          : "/dashboard";
    return actionOk({ redirectTo });
  } catch (error) {
    return toActionError(error, (e) => logger.error("login_action_failed", { error: String(e) }));
  }
}

export async function signupAction(input: SignupInput): Promise<ActionResult<undefined>> {
  try {
    const parsed = signupSchema.parse(input);
    const ip = await clientIp();
    await consumeRateLimit(RATE_LIMITS.signup, ip);
    await signup(parsed);
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) => logger.error("signup_action_failed", { error: String(e) }));
  }
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput,
): Promise<ActionResult<undefined>> {
  try {
    const parsed = forgotPasswordSchema.parse(input);
    const ip = await clientIp();
    await consumeRateLimit(RATE_LIMITS.passwordReset, ip);
    await consumeRateLimit(RATE_LIMITS.passwordReset, `${ip}:${parsed.email}`);
    await requestPasswordReset(parsed.email);
    return actionOk(undefined); // always success — no enumeration
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("forgot_password_action_failed", { error: String(e) }),
    );
  }
}

export async function resetPasswordAction(
  input: ResetPasswordInput,
): Promise<ActionResult<undefined>> {
  try {
    const parsed = resetPasswordSchema.parse(input);
    const ip = await clientIp();
    await consumeRateLimit(RATE_LIMITS.passwordReset, ip);
    await resetPassword(parsed.token, parsed.password);
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("reset_password_action_failed", { error: String(e) }),
    );
  }
}

export async function changePasswordAction(
  input: ChangePasswordInput,
): Promise<ActionResult<undefined>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) redirect("/login");
    const parsed = changePasswordSchema.parse(input);
    await changePassword(ctx.userId, parsed.currentPassword, parsed.password);
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("change_password_action_failed", { error: String(e) }),
    );
  }
}

export async function verifyEmailAction(token: string): Promise<ActionResult<undefined>> {
  try {
    await verifyEmail(token);
    return actionOk(undefined);
  } catch (error) {
    return toActionError(error, (e) =>
      logger.error("verify_email_action_failed", { error: String(e) }),
    );
  }
}

export async function signOutAction(): Promise<void> {
  const ctx = await getAuthContext();
  if (ctx) {
    await recordAudit({
      action: AUDIT_ACTIONS.LOGOUT,
      actorUserId: ctx.userId,
      accountId: ctx.accountId,
    });
  }
  await signOut({ redirectTo: "/login" });
}
