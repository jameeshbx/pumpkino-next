import "server-only";
import type { DmcListing, DmcPackage } from "@prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { NotFoundError } from "@/domain/errors";
import type { AuthContext } from "@/application/auth/session";

/**
 * DMC self-service listing management. The marketplace listing is created
 * lazily as a DRAFT the first time the DMC opens "Destinations & packages";
 * platform ops decide when it goes ACTIVE (admin listings curation).
 */

export async function getOrCreateOwnListing(ctx: AuthContext): Promise<DmcListing> {
  const accountId = ctx.accountId!;
  const existing = await prisma.dmcListing.findUnique({ where: { accountId } });
  if (existing) return existing;

  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  return prisma.dmcListing.create({
    data: {
      accountId,
      name: account.name,
      city: account.city ?? "",
      country: account.country,
      verified: account.verificationStatus === "APPROVED",
      status: "DRAFT",
    },
  });
}

export async function updateOwnListing(
  ctx: AuthContext,
  input: { destinations: string[]; services: string[]; description: string },
): Promise<void> {
  const listing = await getOrCreateOwnListing(ctx);
  await prisma.dmcListing.update({
    where: { id: listing.id },
    data: {
      destinations: input.destinations,
      services: input.services,
      description: input.description,
    },
  });
  await recordAudit({
    action: AUDIT_ACTIONS.LISTING_UPDATED,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    entityType: "DmcListing",
    entityId: listing.id,
  });
}

async function ownPackage(ctx: AuthContext, packageId: string): Promise<DmcPackage> {
  const pkg = await prisma.dmcPackage.findFirst({
    where: { id: packageId, listing: { accountId: ctx.accountId! } },
  });
  if (!pkg) throw new NotFoundError("Package");
  return pkg;
}

export interface PackageInput {
  title: string;
  dest: string;
  duration: string;
  price: number;
  unit: string;
  highlights: string[];
}

export async function createPackage(ctx: AuthContext, input: PackageInput): Promise<DmcPackage> {
  const listing = await getOrCreateOwnListing(ctx);
  return prisma.dmcPackage.create({ data: { listingId: listing.id, ...input } });
}

export async function updatePackage(
  ctx: AuthContext,
  packageId: string,
  input: PackageInput,
): Promise<void> {
  const pkg = await ownPackage(ctx, packageId);
  await prisma.dmcPackage.update({ where: { id: pkg.id }, data: input });
}

export async function deletePackage(ctx: AuthContext, packageId: string): Promise<void> {
  const pkg = await ownPackage(ctx, packageId);
  await prisma.dmcPackage.delete({ where: { id: pkg.id } });
}
