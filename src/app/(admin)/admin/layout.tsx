import { redirect } from "next/navigation";
import { isPlatformStaff, requireAuth } from "@/application/auth/session";
import { signOutAction } from "@/features/authentication/actions";
import { AppShell } from "@/shared/components/app-shell/app-shell";
import { ADMIN_NAV, filterNav } from "@/shared/constants/nav";
import { ROLE_DISPLAY_NAMES, type RoleKey } from "@/domain/rbac/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuth();
  if (!isPlatformStaff(ctx)) redirect("/");

  const roleLabel = ctx.roles.map((r) => ROLE_DISPLAY_NAMES[r as RoleKey] ?? r).join(", ");

  return (
    <AppShell
      brand="Pumpkino"
      surfaceLabel="Ops"
      navItems={filterNav(ADMIN_NAV, ctx.permissions)}
      userName={ctx.name}
      userRoleLabel={roleLabel}
      onSignOut={signOutAction}
    >
      {children}
    </AppShell>
  );
}
