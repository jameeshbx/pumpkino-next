import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP for rate limiting (behind a proxy: first XFF hop). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}
