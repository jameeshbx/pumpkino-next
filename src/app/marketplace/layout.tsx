import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/application/auth/session";
import { isPlatformStaff } from "@/application/auth/session";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { Button } from "@/shared/components/ui/button";

/**
 * Marketplace is a shared surface (agency, DMC, ops can all browse), so it
 * carries a slim header with a "back to my dashboard" link instead of a
 * full sidebar.
 */
export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuth();
  const home = isPlatformStaff(ctx) ? "/admin" : ctx.accountType === "DMC" ? "/dmc" : "/dashboard";

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold tracking-tight">
              🎃 Pumpkino
            </Link>
            <span className="text-sm text-muted-foreground">DMC Marketplace</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link href={home}>
                <ArrowLeft className="mr-1 h-4 w-4" /> My dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
