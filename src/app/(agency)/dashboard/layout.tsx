import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/application/auth/session";
import { signOutAction } from "@/features/authentication/actions";
import { AppShell } from "@/shared/components/app-shell/app-shell";
import { AGENCY_NAV, filterNav } from "@/shared/constants/nav";
import { ROLE_DISPLAY_NAMES, type RoleKey } from "@/domain/rbac/roles";
import { isPaidPlan } from "@/domain/billing/plans";

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuth();
  if (ctx.accountType !== "AGENCY") redirect("/");

  const roleLabel = ctx.roles.map((r) => ROLE_DISPLAY_NAMES[r as RoleKey] ?? r).join(", ");
  const plan = ctx.account?.plan ?? "TRIAL";
  const trialDaysLeft = ctx.account?.trialEndsAt
    ? Math.max(0, Math.ceil((ctx.account.trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const banner =
    !isPaidPlan(plan) && ctx.permissions.has("billing:manage") ? (
      <div className="border-b bg-warning/10 px-4 py-2 text-center text-sm sm:px-6">
        {plan === "TRIAL" && trialDaysLeft !== null ? (
          <>
            <strong>{trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"}</strong> left in your free
            trial.{" "}
          </>
        ) : (
          <>You&apos;re on the free tier. </>
        )}
        <Link href="/dashboard/subscription" className="font-semibold text-primary underline-offset-4 hover:underline">
          Upgrade to unlock full DMC identity and quote requests →
        </Link>
      </div>
    ) : null;

  return (
    <AppShell
      brand="Pumpkino"
      surfaceLabel="Agency"
      navItems={filterNav(AGENCY_NAV, ctx.permissions)}
      userName={ctx.name}
      userRoleLabel={roleLabel}
      onSignOut={signOutAction}
      banner={banner}
    >
      {children}
    </AppShell>
  );
}
