import { ZodError } from "zod";
import { DomainError } from "@/domain/errors";
import { logger } from "@/shared/lib/logger";

/**
 * Uniform server-action result envelope.
 *
 * Error handling policy (OWASP A05/A09): domain errors surface their safe,
 * intentional message; unexpected errors are logged server-side and the
 * client only ever sees a generic message — never a stack trace.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string[]> };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(error: string, code?: string): ActionResult<never> {
  return { ok: false, error, code };
}

export const GENERIC_ERROR = "Something went wrong. Please try again.";

export function toActionError(error: unknown, log: (e: unknown) => void): ActionResult<never> {
  if (error instanceof DomainError) {
    return { ok: false, error: error.message, code: error.code };
  }
  if (error instanceof ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "Invalid input.", code: "VALIDATION" };
  }
  // Next.js redirect()/notFound() must propagate.
  if (error instanceof Error && "digest" in error) throw error;
  log(error);
  return { ok: false, error: GENERIC_ERROR };
}

/** Wraps a server-action body in the standard try/catch + envelope. */
export async function toActionResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return actionOk(await fn());
  } catch (error) {
    return toActionError(error, (e) => logger.error("action_failed", { error: String(e) }));
  }
}
