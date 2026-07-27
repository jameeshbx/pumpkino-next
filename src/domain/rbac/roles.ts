/**
 * Role model (PRD Section 4 + prototype ROLES matrix).
 *
 * Permissions themselves are DB rows (extensible/configurable). The pieces
 * below are pure business rules that don't fit a flat permission list:
 * who can create which roles, and how lead visibility is scoped.
 */

export const ROLE_KEYS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  OPS_ADMIN: "OPS_ADMIN",
  AGENCY_OWNER: "AGENCY_OWNER",
  AGENCY_MANAGER: "AGENCY_MANAGER",
  AGENCY_TEAM_LEAD: "AGENCY_TEAM_LEAD",
  AGENCY_DESTINATION_HEAD: "AGENCY_DESTINATION_HEAD",
  AGENCY_DESTINATION_MANAGER: "AGENCY_DESTINATION_MANAGER",
  AGENCY_EXECUTIVE: "AGENCY_EXECUTIVE",
  AGENCY_ACCOUNTS: "AGENCY_ACCOUNTS",
  DMC_OWNER: "DMC_OWNER",
  DMC_STAFF: "DMC_STAFF",
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const PLATFORM_ROLES: RoleKey[] = ["SUPER_ADMIN", "OPS_ADMIN"];

export const AGENCY_ROLES: RoleKey[] = [
  "AGENCY_OWNER",
  "AGENCY_MANAGER",
  "AGENCY_TEAM_LEAD",
  "AGENCY_DESTINATION_HEAD",
  "AGENCY_DESTINATION_MANAGER",
  "AGENCY_EXECUTIVE",
  "AGENCY_ACCOUNTS",
];

export const ROLE_DISPLAY_NAMES: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  OPS_ADMIN: "Ops Admin",
  AGENCY_OWNER: "Travel Agent Admin",
  AGENCY_MANAGER: "Manager",
  AGENCY_TEAM_LEAD: "Team Lead",
  AGENCY_DESTINATION_HEAD: "Destination Head",
  AGENCY_DESTINATION_MANAGER: "Destination Manager",
  AGENCY_EXECUTIVE: "Executive",
  AGENCY_ACCOUNTS: "Accounts",
  DMC_OWNER: "DMC Admin",
  DMC_STAFF: "DMC Staff",
};

/** Lead visibility scope per role (prototype `leadScope`). */
export type LeadScope = "all" | "team" | "destinations" | "assigned" | "none";

export const LEAD_SCOPE: Record<string, LeadScope> = {
  AGENCY_OWNER: "all",
  AGENCY_MANAGER: "all",
  AGENCY_TEAM_LEAD: "team",
  AGENCY_DESTINATION_HEAD: "destinations",
  AGENCY_DESTINATION_MANAGER: "destinations",
  AGENCY_EXECUTIVE: "assigned",
  AGENCY_ACCOUNTS: "none",
};

/**
 * Which roles a given role may create/edit (prototype `canCreateRoles`).
 * Empty list = cannot manage users at all.
 */
export const CAN_CREATE_ROLES: Record<string, RoleKey[]> = {
  AGENCY_OWNER: AGENCY_ROLES,
  AGENCY_MANAGER: [
    "AGENCY_TEAM_LEAD",
    "AGENCY_DESTINATION_HEAD",
    "AGENCY_DESTINATION_MANAGER",
    "AGENCY_EXECUTIVE",
    "AGENCY_ACCOUNTS",
  ],
  DMC_OWNER: ["DMC_STAFF"],
};

export function canCreateRole(actorRole: string, targetRole: string): boolean {
  return (CAN_CREATE_ROLES[actorRole] ?? []).includes(targetRole as RoleKey);
}

export function canManageUsers(actorRole: string): boolean {
  return (CAN_CREATE_ROLES[actorRole] ?? []).length > 0;
}

/** Role-specific extra fields in the user form (prototype flow, Section 4). */
export function roleExtraField(
  roleKey: string,
): "teamType" | "teamLead" | "destinations" | null {
  switch (roleKey) {
    case "AGENCY_TEAM_LEAD":
      return "teamType";
    case "AGENCY_EXECUTIVE":
      return "teamLead";
    case "AGENCY_DESTINATION_HEAD":
    case "AGENCY_DESTINATION_MANAGER":
      return "destinations";
    default:
      return null;
  }
}
