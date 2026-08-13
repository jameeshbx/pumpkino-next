"use server";

import { consumeRateLimit, RATE_LIMITS } from "@/infrastructure/security/rate-limiter";
import { submitSupportMessage } from "@/application/support/support-service";
import { supportContactSchema, type SupportContactInput } from "@/features/support/schemas";
import { toActionResult } from "@/shared/lib/action-result";
import { clientIp } from "@/shared/lib/request-ip";

export async function submitSupportMessageAction(input: SupportContactInput) {
  return toActionResult(async () => {
    const parsed = supportContactSchema.parse(input);
    const ip = await clientIp();
    await consumeRateLimit(RATE_LIMITS.supportContact, ip);
    await submitSupportMessage(parsed);
    return { submitted: true as const };
  });
}
