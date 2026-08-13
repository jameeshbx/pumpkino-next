import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuthContext, isPlatformStaff } from "@/application/auth/session";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { Button } from "@/shared/components/ui/button";
import { PumpkinoWordmark } from "@/shared/components/logo";

/**
 * Marketplace is public — anyone can browse (PRD: "everyone can browse",
 * identity/quote-requests gated behind a paid agency plan, not behind
 * login). Signed-in users get a "back to my dashboard" link; anonymous
 * visitors get log in / sign up instead.
 */
export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  const home = ctx ? (isPlatformStaff(ctx) ? "/admin" : ctx.accountType === "DMC" ? "/dmc" : "/dashboard") : null;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <PumpkinoWordmark />
            </Link>
            <span className="text-sm text-muted-foreground">DMC Marketplace</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {home ? (
              <Button asChild variant="outline" size="sm">
                <Link href={home}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> My dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/signup?role=agency">Start free trial</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
