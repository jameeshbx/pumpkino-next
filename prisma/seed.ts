/**
 * Development seed.
 *
 * Creates: RBAC roles/permissions, a platform ops admin, a demo travel agency
 * (with the full role roster from the prototype), a demo DMC, marketplace
 * listings, leads, quote requests, disputes, subscriptions and invoices —
 * mirroring the prototype's in-memory seed data.
 *
 * Idempotent: safe to re-run (upserts keyed on natural identifiers).
 */
import { PrismaClient, AccountType, Plan, RoleScope } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const DEMO_PASSWORD = "Pumpkino!Demo2026";

// ── RBAC catalogue ───────────────────────────────────────────────────────────

const PERMISSIONS: Record<string, string> = {
  "platform:verification:review": "Review verification submissions",
  "platform:accounts:manage": "Suspend/manage customer accounts",
  "platform:disputes:manage": "Manage disputes",
  "platform:listings:manage": "Curate marketplace listings",
  "platform:reports:export": "Export platform reports",
  "platform:revenue:read": "View subscriptions & revenue",
  "platform:roles:manage": "Manage roles and permissions",

  "dashboard:read": "View own dashboard",
  "leads:read": "View leads in scope",
  "leads:manage": "Create/update leads in scope",
  "leads:import": "Import leads from CSV",
  "crm:read": "View CRM customers",
  "itineraries:read": "View itineraries",
  "dmc-network:read": "View private DMC address book",
  "dmc-network:manage": "Edit private DMC address book",
  "payments:read": "View payments",
  "invoices:read": "View invoices",
  "markup:manage": "Manage markup rules",
  "reports:export": "Export reports",
  "users:manage": "Add/edit/suspend/remove users",
  "bank-details:manage": "Edit bank details",
  "settings:manage": "Edit account settings (incl. tax profile)",
  "billing:manage": "Manage subscription & billing",
  "verification:submit": "Submit business verification",
  "marketplace:quote-request": "Send quote requests to DMCs (paid plans)",

  "quotes:read": "View incoming quote requests (DMC)",
  "quotes:manage": "Respond to quote requests (DMC)",
  "packages:manage": "Manage destination packages (DMC)",
};

type RoleSeed = {
  key: string;
  name: string;
  scope: RoleScope;
  accountType: AccountType | null;
  permissions: string[];
};

const AGENCY_BASE = ["dashboard:read", "leads:read", "crm:read", "itineraries:read"];

const ROLES: RoleSeed[] = [
  {
    key: "SUPER_ADMIN",
    name: "Super Admin",
    scope: RoleScope.PLATFORM,
    accountType: null,
    permissions: Object.keys(PERMISSIONS).filter((k) => k.startsWith("platform:")),
  },
  {
    key: "OPS_ADMIN",
    name: "Ops Admin",
    scope: RoleScope.PLATFORM,
    accountType: null,
    permissions: [
      "platform:verification:review",
      "platform:accounts:manage",
      "platform:disputes:manage",
      "platform:listings:manage",
      "platform:reports:export",
      "platform:revenue:read",
    ],
  },
  // Agency roles — mirror the prototype ROLES matrix
  {
    key: "AGENCY_OWNER",
    name: "Travel Agent Admin",
    scope: RoleScope.ACCOUNT,
    accountType: AccountType.AGENCY,
    permissions: [
      ...AGENCY_BASE,
      "leads:manage",
      "leads:import",
      "dmc-network:read",
      "dmc-network:manage",
      "payments:read",
      "invoices:read",
      "markup:manage",
      "reports:export",
      "users:manage",
      "bank-details:manage",
      "settings:manage",
      "billing:manage",
      "verification:submit",
      "marketplace:quote-request",
    ],
  },
  {
    key: "AGENCY_MANAGER",
    name: "Manager",
    scope: RoleScope.ACCOUNT,
    accountType: AccountType.AGENCY,
    permissions: [
      ...AGENCY_BASE,
      "leads:manage",
      "leads:import",
      "dmc-network:read",
      "dmc-network:manage",
      "payments:read",
      "invoices:read",
      "markup:manage",
      "reports:export",
      "users:manage",
      "settings:manage",
      "marketplace:quote-request",
    ],
  },
  {
    key: "AGENCY_TEAM_LEAD",
    name: "Team Lead",
    scope: RoleScope.ACCOUNT,
    accountType: AccountType.AGENCY,
    permissions: [...AGENCY_BASE, "leads:manage", "dmc-network:read", "reports:export"],
  },
  {
    key: "AGENCY_DESTINATION_HEAD",
    name: "Destination Head",
    scope: RoleScope.ACCOUNT,
    accountType: AccountType.AGENCY,
    permissions: [...AGENCY_BASE, "leads:manage", "dmc-network:read", "reports:export"],
  },
  {
    key: "AGENCY_DESTINATION_MANAGER",
    name: "Destination Manager",
    scope: RoleScope.ACCOUNT,
    accountType: AccountType.AGENCY,
    permissions: [...AGENCY_BASE, "leads:manage", "dmc-network:read", "reports:export"],
  },
  {
    key: "AGENCY_EXECUTIVE",
    name: "Executive",
    scope: RoleScope.ACCOUNT,
    accountType: AccountType.AGENCY,
    permissions: ["dashboard:read", "leads:read", "leads:manage"],
  },
  {
    key: "AGENCY_ACCOUNTS",
    name: "Accounts",
    scope: RoleScope.ACCOUNT,
    accountType: AccountType.AGENCY,
    permissions: [
      "dashboard:read",
      "payments:read",
      "invoices:read",
      "markup:manage",
      "reports:export",
      "bank-details:manage",
    ],
  },
  // DMC roles
  {
    key: "DMC_OWNER",
    name: "DMC Admin",
    scope: RoleScope.ACCOUNT,
    accountType: AccountType.DMC,
    permissions: [
      "dashboard:read",
      "quotes:read",
      "quotes:manage",
      "packages:manage",
      "payments:read",
      "invoices:read",
      "users:manage",
      "bank-details:manage",
      "settings:manage",
      "reports:export",
      "verification:submit",
    ],
  },
  {
    key: "DMC_STAFF",
    name: "DMC Staff",
    scope: RoleScope.ACCOUNT,
    accountType: AccountType.DMC,
    permissions: ["dashboard:read", "quotes:read", "quotes:manage", "packages:manage"],
  },
];

async function seedRbac() {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name, scope: role.scope, accountType: role.accountType },
      create: {
        key: role.key,
        name: role.name,
        scope: role.scope,
        accountType: role.accountType,
        isSystem: true,
      },
    });
    const perms = await prisma.permission.findMany({ where: { key: { in: role.permissions } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: created.id } });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: created.id, permissionId: p.id })),
    });
  }
  console.log(`✓ RBAC: ${ROLES.length} roles, ${Object.keys(PERMISSIONS).length} permissions`);
}

// ── Users & accounts ─────────────────────────────────────────────────────────

async function upsertUser(opts: {
  email: string;
  name: string;
  passwordHash: string;
  accountId?: string;
  roleKey: string;
  teamType?: string;
  teamLeadId?: string;
  assignedDestinations?: string[];
  emailVerified?: boolean;
}) {
  const role = await prisma.role.findUniqueOrThrow({ where: { key: opts.roleKey } });
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    update: {},
    create: {
      email: opts.email,
      name: opts.name,
      passwordHash: opts.passwordHash,
      accountId: opts.accountId ?? null,
      teamType: opts.teamType ?? null,
      teamLeadId: opts.teamLeadId ?? null,
      assignedDestinations: opts.assignedDestinations ?? [],
      emailVerifiedAt: opts.emailVerified === false ? null : new Date(),
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
  return user;
}

async function main() {
  console.log("Seeding Pumpkino…");
  await seedRbac();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "ops@pumpkino.test";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Ops2026";
  const adminHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

  // Platform admin
  await upsertUser({
    email: adminEmail,
    name: "Pumpkino Ops",
    passwordHash: adminHash,
    roleKey: "SUPER_ADMIN",
  });
  console.log(`✓ Platform admin: ${adminEmail}`);

  // ── Demo agency ────────────────────────────────────────────────────────────
  const agency = await prisma.account.upsert({
    where: { email: "agency@pumpkino.test" },
    update: {},
    create: {
      type: AccountType.AGENCY,
      name: "Trekking Miles Holidays",
      contactName: "Agent Admin",
      email: "agency@pumpkino.test",
      phone: "+91 98450 00001",
      city: "Kochi",
      state: "Kerala",
      country: "India",
      plan: Plan.GROWTH,
      verificationStatus: "APPROVED",
      mrr: 4999,
      gateway: "RAZORPAY",
      taxSchemeKey: "IN_GST_5_NO_ITC",
      taxRate: 5,
      taxAppliesTo: "TOTAL",
    },
  });

  const agencyOwner = await upsertUser({
    email: "agentadmin@pumpkino.test",
    name: "Agent Admin",
    passwordHash,
    accountId: agency.id,
    roleKey: "AGENCY_OWNER",
  });
  await upsertUser({
    email: "arjun@pumpkino.test",
    name: "Arjun Nair",
    passwordHash,
    accountId: agency.id,
    roleKey: "AGENCY_MANAGER",
  });
  const teamLead = await upsertUser({
    email: "meera@pumpkino.test",
    name: "Meera Pillai",
    passwordHash,
    accountId: agency.id,
    roleKey: "AGENCY_TEAM_LEAD",
    teamType: "Sales",
  });
  const executive = await upsertUser({
    email: "kiran@pumpkino.test",
    name: "Kiran Nambiar",
    passwordHash,
    accountId: agency.id,
    roleKey: "AGENCY_EXECUTIVE",
    teamLeadId: teamLead.id,
  });
  await upsertUser({
    email: "anand@pumpkino.test",
    name: "Anand Menon",
    passwordHash,
    accountId: agency.id,
    roleKey: "AGENCY_DESTINATION_HEAD",
    assignedDestinations: ["Munnar", "Alleppey"],
  });
  await upsertUser({
    email: "divya@pumpkino.test",
    name: "Divya Nair",
    passwordHash,
    accountId: agency.id,
    roleKey: "AGENCY_DESTINATION_MANAGER",
    assignedDestinations: ["Wayanad"],
  });
  await upsertUser({
    email: "accounts@pumpkino.test",
    name: "Latha Krishnan",
    passwordHash,
    accountId: agency.id,
    roleKey: "AGENCY_ACCOUNTS",
  });
  console.log("✓ Demo agency + 7 users");

  // A second, trial-plan agency (to demo the paid gate)
  const trialAgency = await prisma.account.upsert({
    where: { email: "trial-agency@pumpkino.test" },
    update: {},
    create: {
      type: AccountType.AGENCY,
      name: "Blue Horizon Tours",
      contactName: "Rahul Nair",
      email: "trial-agency@pumpkino.test",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      plan: Plan.TRIAL,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await upsertUser({
    email: "rahul@pumpkino.test",
    name: "Rahul Nair",
    passwordHash,
    accountId: trialAgency.id,
    roleKey: "AGENCY_OWNER",
  });
  console.log("✓ Trial agency (paid-gate demo)");

  // ── Demo DMC ───────────────────────────────────────────────────────────────
  const dmc = await prisma.account.upsert({
    where: { email: "dmc@pumpkino.test" },
    update: {},
    create: {
      type: AccountType.DMC,
      name: "Kerala Tour Mart DMC",
      contactName: "Suresh Kumar",
      email: "dmc@pumpkino.test",
      phone: "+91 98470 00002",
      city: "Kochi",
      state: "Kerala",
      country: "India",
      plan: Plan.FREE,
      verificationStatus: "APPROVED",
    },
  });
  await upsertUser({
    email: "dmcadmin@pumpkino.test",
    name: "Suresh Kumar",
    passwordHash,
    accountId: dmc.id,
    roleKey: "DMC_OWNER",
  });
  console.log("✓ Demo DMC");

  // A DMC with a pending verification (for the admin queue)
  const pendingDmc = await prisma.account.upsert({
    where: { email: "pending-dmc@pumpkino.test" },
    update: {},
    create: {
      type: AccountType.DMC,
      name: "Gulf Experience DMC",
      contactName: "Omar Al Fardan",
      email: "pending-dmc@pumpkino.test",
      city: "Abu Dhabi",
      country: "UAE",
      plan: Plan.FREE,
      verificationStatus: "SUBMITTED",
      taxSchemeKey: "AE_VAT_TOMS",
      taxRate: 5,
      taxAppliesTo: "MARGIN",
    },
  });
  await upsertUser({
    email: "omar@pumpkino.test",
    name: "Omar Al Fardan",
    passwordHash,
    accountId: pendingDmc.id,
    roleKey: "DMC_OWNER",
  });
  const existingSubmission = await prisma.verificationSubmission.findFirst({
    where: { accountId: pendingDmc.id },
  });
  if (!existingSubmission) {
    await prisma.verificationSubmission.create({
      data: {
        accountId: pendingDmc.id,
        bizReg: "AD-2214-TRV",
        extra: "UAE trade licence, tourism category",
        status: "SUBMITTED",
      },
    });
  }
  console.log("✓ Pending verification submission");

  // ── Marketplace listings (admin-curated, phase 1) ─────────────────────────
  const listings = [
    {
      name: "Kerala Tour Mart DMC",
      city: "Kochi",
      country: "India",
      destinations: ["Kerala", "Backwaters"],
      services: ["Hotels", "Houseboats", "Transport", "Guides"],
      verified: true,
      bookings: 214,
      responseHrs: 4,
      description:
        "Full-service Kerala DMC covering backwaters, hill stations and beaches with 12 years of B2B experience.",
      accountId: dmc.id,
      packages: [
        {
          title: "Classic Kerala Circuit",
          dest: "Munnar · Thekkady · Alleppey",
          duration: "5N / 6D",
          price: 18500,
          unit: "per person",
          highlights: ["Houseboat night", "Spice plantation tour", "All transfers"],
        },
        {
          title: "Backwater Honeymoon",
          dest: "Alleppey · Kumarakom",
          duration: "3N / 4D",
          price: 24000,
          unit: "per couple",
          highlights: ["Premium houseboat", "Candlelight dinner"],
        },
      ],
      reviews: [
        {
          agency: "Wanderlust Kerala",
          rating: 5,
          comment: "Fast quotes, reliable ground handling.",
        },
        { agency: "Coastal Escapes", rating: 4, comment: "Good rates on houseboats." },
      ],
    },
    {
      name: "Coastal Karnataka DMC",
      city: "Mangalore",
      country: "India",
      destinations: ["Karnataka", "Coastal Karnataka"],
      services: ["Hotels", "Transport", "Activities & Tours"],
      verified: true,
      bookings: 96,
      responseHrs: 8,
      description: "Coastal Karnataka specialists — Gokarna, Udupi, Murudeshwar.",
      packages: [
        {
          title: "Gokarna Beach Trail",
          dest: "Gokarna · Murudeshwar",
          duration: "3N / 4D",
          price: 12500,
          unit: "per person",
          highlights: ["Beach trek", "Temple circuit"],
        },
      ],
      reviews: [],
    },
    {
      name: "Gulf Experience DMC",
      city: "Abu Dhabi",
      country: "UAE",
      destinations: ["UAE", "Abu Dhabi", "Dubai"],
      services: ["Hotels", "Transport", "Activities & Tours", "Visa Assistance"],
      verified: true,
      bookings: 148,
      responseHrs: 6,
      description: "UAE inbound DMC with visa desk and multilingual guides.",
      accountId: pendingDmc.id,
      packages: [
        {
          title: "Dubai City Break",
          dest: "Dubai",
          duration: "4N / 5D",
          price: 52000,
          unit: "per person",
          highlights: ["Desert safari", "Burj Khalifa"],
        },
      ],
      reviews: [{ agency: "Trekking Miles Holidays", rating: 5, comment: "Visas sorted in 48h." }],
    },
    {
      name: "Siam Discovery DMC",
      city: "Bangkok",
      country: "Thailand",
      destinations: ["Thailand", "Bangkok", "Phuket"],
      services: ["Hotels", "Transport", "Activities & Tours", "Guides"],
      verified: false,
      bookings: 61,
      responseHrs: 12,
      description: "Thailand ground operator for Indian outbound groups.",
      packages: [],
      reviews: [],
    },
    {
      name: "Rajasthan Heritage DMC",
      city: "Jaipur",
      country: "India",
      destinations: ["Rajasthan", "Jaipur", "Udaipur"],
      services: ["Hotels", "Transport", "Guides", "Cultural Tours"],
      verified: true,
      bookings: 189,
      responseHrs: 5,
      description: "Palace stays and heritage circuits across Rajasthan.",
      packages: [
        {
          title: "Golden Triangle Plus",
          dest: "Jaipur · Agra · Delhi",
          duration: "5N / 6D",
          price: 21000,
          unit: "per person",
          highlights: ["Palace hotel night", "Guided forts tour"],
        },
      ],
      reviews: [],
    },
    {
      name: "Goa Coastal Getaways DMC",
      city: "Panaji",
      country: "India",
      destinations: ["Goa"],
      services: ["Hotels", "Transport", "Activities & Tours", "Houseboats"],
      verified: true,
      bookings: 132,
      responseHrs: 7,
      description: "Goa beach resorts, water sports and offbeat south Goa.",
      packages: [],
      reviews: [],
    },
    {
      name: "Himalayan Trails DMC",
      city: "Manali",
      country: "India",
      destinations: ["Himachal", "Kashmir", "Ladakh"],
      services: ["Hotels", "Transport", "Guides", "Trekking"],
      verified: false,
      bookings: 44,
      responseHrs: 18,
      description: "High-altitude specialists — Ladakh circuits and Himachal treks.",
      packages: [],
      reviews: [],
      status: "DRAFT" as const,
    },
  ];

  for (const l of listings) {
    const existing = await prisma.dmcListing.findFirst({ where: { name: l.name } });
    if (existing) continue;
    await prisma.dmcListing.create({
      data: {
        name: l.name,
        city: l.city,
        country: l.country,
        destinations: l.destinations,
        services: l.services,
        verified: l.verified,
        bookings: l.bookings,
        responseHrs: l.responseHrs,
        description: l.description,
        status: l.status ?? "PUBLISHED",
        accountId: "accountId" in l ? l.accountId : undefined,
        packages: { create: l.packages },
        reviews: { create: l.reviews },
      },
    });
  }
  console.log(`✓ ${listings.length} marketplace listings`);

  // ── Leads (agency CRM) — mirrors prototype board ──────────────────────────
  const leadCount = await prisma.lead.count({ where: { accountId: agency.id } });
  if (leadCount === 0) {
    const leads = [
      {
        name: "Nandu",
        destination: "Munnar",
        pax: "Family of 2",
        stage: "NEW" as const,
        mobile: "+91 98450 11223",
        email: "nandu@email.com",
        startDate: new Date("2026-08-02"),
        assignedToId: executive.id,
      },
      {
        name: "Priya Mathan",
        destination: "Wayanad",
        pax: "Group of 17",
        stage: "NEW" as const,
        mobile: "+91 90000 22334",
        email: "priya.mathan@email.com",
        startDate: new Date("2026-08-10"),
      },
      {
        name: "Vaishnavi Ghonge",
        destination: "Kerala backwaters",
        pax: "Solo traveller",
        stage: "SENT" as const,
        quotedPrice: 41600,
        mobile: "+91 98230 44556",
        email: "vaishnavi.g@email.com",
        startDate: new Date("2026-07-28"),
      },
      {
        name: "Jameesh",
        destination: "Istanbul, Cappadocia",
        pax: "Family of 4",
        stage: "CONFIRMED" as const,
        mobile: "+91 99470 55667",
        email: "jameesh@email.com",
        startDate: new Date("2026-09-14"),
      },
      {
        name: "Beena Balakrishnan",
        destination: "Delhi, Agra, Jaipur",
        pax: "Family of 4",
        stage: "DMC" as const,
        quotedPrice: 51600,
        dmcPrice: 51600,
        dmcName: "Kerala Tour Mart",
        mobile: "+91 98470 22110",
        email: "beena.b@email.com",
        startDate: new Date("2026-08-20"),
      },
      {
        name: "M S Hameed",
        destination: "Munnar, Alleppey",
        pax: "Family of 2",
        stage: "MARKUP" as const,
        quotedPrice: 64900,
        dmcPrice: 55000,
        dmcName: "Kerala Tour Mart",
        finalPrice: 64900,
        markupLabel: "18% margin",
        orderId: "ORD-2026-0003",
        mobile: "+91 94470 66778",
        email: "hameed.ms@email.com",
        startDate: new Date("2026-08-05"),
      },
      {
        name: "Sushrutha Jadhav",
        destination: "Domestic package",
        pax: "Couple",
        stage: "PAYMENT" as const,
        finalPrice: 28500,
        dmcName: "Kerala Tour Mart",
        dmcPrice: 24000,
        orderId: "ORD-2026-0001",
        mobile: "+91 98470 77889",
        email: "sushrutha.j@email.com",
        startDate: new Date("2026-07-25"),
      },
      {
        name: "Yatrasoul",
        destination: "Munnar, Alleppey",
        pax: "Solo traveller",
        stage: "DONE" as const,
        finalPrice: 42000,
        dmcName: "Kerala Tour Mart",
        dmcPrice: 36000,
        orderId: "ORD-2026-0002",
        mobile: "+91 90480 88990",
        email: "yatrasoul@email.com",
        startDate: new Date("2026-06-15"),
      },
    ];
    for (const l of leads) {
      await prisma.lead.create({
        data: {
          ...l,
          accountId: agency.id,
          createdById: agencyOwner.id,
          activities: {
            create: { type: "created", message: "Lead created (seed)", actorName: "Seed" },
          },
        },
      });
    }
    console.log(`✓ ${leads.length} leads`);
  }

  // ── Quote requests (shared table, read by DMC portal inbox) ───────────────
  const listing = await prisma.dmcListing.findFirst({
    where: { name: "Kerala Tour Mart DMC" },
  });
  const qrCount = await prisma.quoteRequest.count({ where: { dmcAccountId: dmc.id } });
  if (qrCount === 0 && listing) {
    const year = new Date().getFullYear();
    await prisma.documentSequence.upsert({
      where: { kind_year: { kind: "QUOTE", year } },
      update: { value: 2 },
      create: { kind: "QUOTE", year, value: 2 },
    });
    const requests = [
      {
        agentName: "Ebina Paul",
        agencyName: "Trekking Miles Holidays",
        agencyAccountId: agency.id,
        destination: "Munnar",
        pax: "Family of 4",
        nights: 3,
        startDate: new Date("2026-08-10"),
        budget: "₹15,000/head",
        stage: "NEW" as const,
      },
      {
        agentName: "Rahul Nair",
        agencyName: "Blue Horizon Tours",
        agencyAccountId: trialAgency.id,
        destination: "Alleppey",
        pax: "Couple",
        nights: 2,
        startDate: new Date("2026-08-05"),
        budget: "₹20,000/head",
        stage: "NEW" as const,
      },
      {
        agentName: "Priya Suresh",
        agencyName: "Trekking Miles Holidays",
        agencyAccountId: agency.id,
        destination: "Munnar",
        pax: "Group of 8",
        nights: 4,
        startDate: new Date("2026-09-01"),
        budget: "₹12,000/head",
        stage: "REVIEW" as const,
      },
      {
        agentName: "Arjun Menon",
        agencyName: "Trekking Miles Holidays",
        agencyAccountId: agency.id,
        destination: "Kumarakom",
        pax: "Family of 2",
        nights: 2,
        startDate: new Date("2026-07-28"),
        budget: "₹18,000/head",
        stage: "SENT" as const,
        quotedPrice: 38000,
        quoteId: `PMK-Q-${year}-00001`,
      },
      {
        agentName: "Sneha Rao",
        agencyName: "Trekking Miles Holidays",
        agencyAccountId: agency.id,
        destination: "Munnar",
        pax: "Solo traveller",
        nights: 2,
        startDate: new Date("2026-07-20"),
        budget: "₹10,000/head",
        stage: "PAYMENT" as const,
        quotedPrice: 21500,
        quoteId: `PMK-Q-${year}-00002`,
      },
    ];
    for (const r of requests) {
      await prisma.quoteRequest.create({
        data: { ...r, dmcAccountId: dmc.id, listingId: listing.id },
      });
    }
    console.log(`✓ ${requests.length} quote requests`);
  }

  // ── Billing history ────────────────────────────────────────────────────────
  const subCount = await prisma.subscription.count({ where: { accountId: agency.id } });
  if (subCount === 0) {
    const sub = await prisma.subscription.create({
      data: {
        accountId: agency.id,
        plan: Plan.GROWTH,
        gateway: "RAZORPAY",
        currency: "INR",
        amount: 4999,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.documentSequence.upsert({
      where: { kind_year: { kind: "INVOICE", year: new Date().getFullYear() } },
      update: { value: 1 },
      create: { kind: "INVOICE", year: new Date().getFullYear(), value: 1 },
    });
    await prisma.invoice.create({
      data: {
        number: `PMK-INV-${new Date().getFullYear()}-00001`,
        accountId: agency.id,
        subscriptionId: sub.id,
        description: "Growth plan — monthly",
        amount: 4999,
        currency: "INR",
        gateway: "RAZORPAY",
        status: "PAID",
      },
    });
    console.log("✓ Subscription + invoice");
  }

  // ── Disputes ───────────────────────────────────────────────────────────────
  const disputeCount = await prisma.dispute.count();
  if (disputeCount === 0) {
    await prisma.dispute.create({
      data: {
        agencyAccountId: agency.id,
        dmcAccountId: dmc.id,
        subject: "Refund mismatch on cancelled Munnar booking",
        raisedBy: "Trekking Miles Holidays",
        notes: {
          create: {
            author: "Trekking Miles Holidays",
            body: "Advance refund received was ₹4,000 short of the agreed tier.",
          },
        },
      },
    });
    console.log("✓ Sample dispute");
  }

  console.log("\nSeed complete. Demo credentials (all use the same password unless noted):");
  console.log(`  Ops admin       ${adminEmail} / ${adminPassword}`);
  console.log(`  Agency owner    agentadmin@pumpkino.test / ${DEMO_PASSWORD}`);
  console.log(`  Agency manager  arjun@pumpkino.test / ${DEMO_PASSWORD}`);
  console.log(`  Team lead       meera@pumpkino.test / ${DEMO_PASSWORD}`);
  console.log(`  Executive       kiran@pumpkino.test / ${DEMO_PASSWORD}`);
  console.log(`  Trial agency    rahul@pumpkino.test / ${DEMO_PASSWORD}`);
  console.log(`  DMC owner       dmcadmin@pumpkino.test / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
