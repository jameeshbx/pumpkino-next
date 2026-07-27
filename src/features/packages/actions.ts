"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/application/auth/session";
import {
  createPackage,
  deletePackage,
  updateOwnListing,
  updatePackage,
} from "@/application/listings/listing-service";
import { toActionResult, type ActionResult } from "@/shared/lib/action-result";
import {
  listingProfileSchema,
  packageIdSchema,
  packageSchema,
  splitList,
  type ListingProfileInput,
  type PackageFormInput,
} from "./schemas";

function revalidatePackages(): void {
  revalidatePath("/dmc/packages");
  revalidatePath("/marketplace");
}

export async function updateListingProfileAction(
  input: ListingProfileInput,
): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("packages:manage");
    const data = listingProfileSchema.parse(input);
    await updateOwnListing(ctx, {
      destinations: splitList(data.destinations),
      services: splitList(data.services),
      description: data.description.trim(),
    });
    revalidatePackages();
  });
}

function toPackageInput(data: PackageFormInput) {
  return {
    title: data.title,
    dest: data.dest,
    duration: data.duration,
    price: data.price,
    unit: data.unit,
    highlights: splitList(data.highlights),
  };
}

export async function createPackageAction(input: PackageFormInput): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("packages:manage");
    const data = packageSchema.parse(input);
    await createPackage(ctx, toPackageInput(data));
    revalidatePackages();
  });
}

export async function updatePackageAction(
  input: PackageFormInput & { packageId: string },
): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("packages:manage");
    const { packageId } = packageIdSchema.parse({ packageId: input.packageId });
    const data = packageSchema.parse(input);
    await updatePackage(ctx, packageId, toPackageInput(data));
    revalidatePackages();
  });
}

export async function deletePackageAction(input: { packageId: string }): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("packages:manage");
    const { packageId } = packageIdSchema.parse(input);
    await deletePackage(ctx, packageId);
    revalidatePackages();
  });
}
