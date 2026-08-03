import type { NavItem } from "@/shared/components/app-shell/app-shell";

/**
 * Surface navigation configs. Each entry names the permission that must be
 * present for the item to render — the same permission the target page
 * enforces server-side.
 */
export interface GuardedNavItem extends NavItem {
  permission: string | null; // null → visible to any member of the surface
}

export const AGENCY_NAV: GuardedNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", permission: "dashboard:read" },
  { href: "/dashboard/leads", label: "Leads & pipeline", icon: "leads", permission: "leads:read" },
  {
    href: "/dashboard/lost-cancelled",
    label: "Lost & cancelled",
    icon: "lostCancelled",
    permission: "leads:read",
  },
  {
    href: "/dashboard/upcoming",
    label: "Upcoming trips",
    icon: "upcoming",
    permission: "leads:read",
  },
  { href: "/marketplace", label: "DMC marketplace", icon: "marketplace", permission: null },
  {
    href: "/dashboard/quote-requests",
    label: "Quote requests",
    icon: "requests",
    permission: "leads:read",
  },
  { href: "/dashboard/users", label: "Users & roles", icon: "users", permission: "users:manage" },
  {
    href: "/dashboard/subscription",
    label: "Subscription & billing",
    icon: "billing",
    permission: "billing:manage",
  },
  {
    href: "/dashboard/profile",
    label: "Profile & verification",
    icon: "profile",
    permission: "verification:submit",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: "settings",
    permission: "settings:manage",
  },
];

export const DMC_NAV: GuardedNavItem[] = [
  { href: "/dmc", label: "Dashboard", icon: "dashboard", permission: "dashboard:read" },
  { href: "/dmc/requests", label: "Quote requests", icon: "requests", permission: "quotes:read" },
  {
    href: "/dmc/lost-cancelled",
    label: "Lost & cancelled",
    icon: "lostCancelled",
    permission: "quotes:read",
  },
  {
    href: "/dmc/upcoming",
    label: "Upcoming trips",
    icon: "upcoming",
    permission: "quotes:read",
  },
  {
    href: "/dmc/packages",
    label: "Destinations & packages",
    icon: "packages",
    permission: "packages:manage",
  },
  { href: "/dmc/users", label: "Users & roles", icon: "users", permission: "users:manage" },
  {
    href: "/dmc/profile",
    label: "Profile & verification",
    icon: "profile",
    permission: "verification:submit",
  },
  { href: "/dmc/settings", label: "Settings", icon: "settings", permission: "settings:manage" },
];

export const ADMIN_NAV: GuardedNavItem[] = [
  { href: "/admin", label: "Overview", icon: "overview", permission: null },
  {
    href: "/admin/verification",
    label: "Verification queue",
    icon: "verify",
    permission: "platform:verification:review",
  },
  {
    href: "/admin/accounts",
    label: "Accounts",
    icon: "accounts",
    permission: "platform:accounts:manage",
  },
  {
    href: "/admin/disputes",
    label: "Disputes",
    icon: "disputes",
    permission: "platform:disputes:manage",
  },
  {
    href: "/admin/revenue",
    label: "Subscriptions & revenue",
    icon: "revenue",
    permission: "platform:revenue:read",
  },
  {
    href: "/admin/listings",
    label: "Marketplace listings",
    icon: "listings",
    permission: "platform:listings:manage",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: "reports",
    permission: "platform:reports:export",
  },
];

export function filterNav(items: GuardedNavItem[], permissions: Set<string>): NavItem[] {
  return items
    .filter((i) => i.permission === null || permissions.has(i.permission))
    .map(({ href, label, icon }) => ({ href, label, icon }));
}
