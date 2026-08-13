import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/infrastructure/auth/auth.config";

/**
 * Edge middleware:
 * 1. Route protection — redirects unauthenticated users to /login and keeps
 *    users inside the surface that matches their account type/roles.
 *    (Fine-grained permission checks happen again server-side — middleware
 *    is a UX layer, never the only guard.)
 * 2. Per-request CSP nonce so Next's inline scripts run without unsafe-inline.
 */
const { auth } = NextAuth(authConfig);

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

// "/marketplace" is intentionally excluded — it's public (PRD: "everyone can
// browse"); identity/quote-requests are gated by plan, not by login. See
// marketplaceAccess() in application/marketplace/gate.ts.
const PROTECTED_PREFIXES = ["/dashboard", "/dmc", "/admin", "/onboarding", "/change-password"];

function homeFor(session: {
  accountType: string | null;
  roles: string[];
}): string {
  if (session.roles.some((r) => r === "SUPER_ADMIN" || r === "OPS_ADMIN")) return "/admin";
  if (session.accountType === "DMC") return "/dmc";
  return "/dashboard";
}

export default auth((request) => {
  const { nextUrl } = request;
  const session = request.auth?.user;
  const path = nextUrl.pathname;

  // ── Route protection ───────────────────────────────────────────────────
  const isAuthPage = AUTH_PAGES.some((p) => path === p || path.startsWith(`${p}/`));
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (!session && isProtected) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  if (session) {
    const isPlatform = session.roles.some((r) => r === "SUPER_ADMIN" || r === "OPS_ADMIN");

    if (isAuthPage) {
      return NextResponse.redirect(new URL(homeFor(session), nextUrl));
    }
    // Surface isolation: agency ↔ dmc ↔ admin.
    if (path.startsWith("/admin") && !isPlatform) {
      return NextResponse.redirect(new URL(homeFor(session), nextUrl));
    }
    if (path.startsWith("/dashboard") && session.accountType !== "AGENCY") {
      return NextResponse.redirect(new URL(homeFor(session), nextUrl));
    }
    if (path.startsWith("/dmc") && session.accountType !== "DMC") {
      return NextResponse.redirect(new URL(homeFor(session), nextUrl));
    }
  }

  // ── CSP with per-request nonce ─────────────────────────────────────────
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    // Dev needs eval for React Refresh; production is nonce-strict.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", // Tailwind inlines style attributes
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js reads the request CSP header to nonce its own inline scripts.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  // Skip static assets and NextAuth's own API routes.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
