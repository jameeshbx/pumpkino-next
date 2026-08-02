import Link from "next/link";
import { auth } from "@/infrastructure/auth/auth";
import { Button } from "@/shared/components/ui/button";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { PumpkinoWordmark } from "@/shared/components/logo";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <PumpkinoWordmark className="text-lg" />
          </Link>
          <nav aria-label="Marketing" className="hidden items-center gap-6 text-sm font-medium sm:flex">
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/support" className="text-muted-foreground hover:text-foreground">
              Support
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session?.user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Start free trial</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Pumpkino. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-4">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/refund-policy" className="hover:text-foreground">
              Refund policy
            </Link>
            <Link href="/support" className="hover:text-foreground">
              Support
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
