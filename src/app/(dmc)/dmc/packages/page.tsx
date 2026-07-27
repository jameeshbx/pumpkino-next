import type { Metadata } from "next";
import { Package, Pencil, Plus } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { getOrCreateOwnListing } from "@/application/listings/listing-service";
import { prisma } from "@/infrastructure/db/prisma";
import { ListingProfileForm } from "@/features/packages/components/listing-profile-form";
import { PackageDialog } from "@/features/packages/components/package-dialog";
import { PackageDeleteButton } from "@/features/packages/components/package-delete-button";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { formatCurrency } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Destinations & packages" };

const LISTING_STATUS_HINT: Record<string, string> = {
  DRAFT: "Your listing is a draft — it goes live once platform ops publish it.",
  PUBLISHED: "Your listing is live on the marketplace.",
};

export default async function DmcPackagesPage() {
  const ctx = await requirePermissionPage("packages:manage");
  const listing = await getOrCreateOwnListing(ctx);
  const packages = await prisma.dmcPackage.findMany({
    where: { listingId: listing.id },
    orderBy: { title: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Destinations & packages"
        description={LISTING_STATUS_HINT[listing.status]}
        actions={
          <PackageDialog
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add package
              </Button>
            }
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marketplace listing</CardTitle>
            <CardDescription>
              What agencies see when they find {listing.name} on the marketplace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ListingProfileForm
              defaults={{
                destinations: listing.destinations.join(", "),
                services: listing.services.join(", "),
                description: listing.description,
              }}
            />
          </CardContent>
        </Card>

        <div>
          {packages.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No packages yet"
              description="Add your signature packages so agencies can gauge your offering and pricing."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {packages.map((pkg) => (
                <Card key={pkg.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{pkg.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {pkg.dest} · {pkg.duration}
                        </p>
                      </div>
                      <div className="flex shrink-0">
                        <PackageDialog
                          packageId={pkg.id}
                          defaults={{
                            title: pkg.title,
                            dest: pkg.dest,
                            duration: pkg.duration,
                            price: pkg.price,
                            unit: pkg.unit,
                            highlights: pkg.highlights.join(", "),
                          }}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label={`Edit ${pkg.title}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <PackageDeleteButton packageId={pkg.id} title={pkg.title} />
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-medium">
                      {formatCurrency(pkg.price)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">{pkg.unit}</span>
                    </p>
                    {pkg.highlights.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {pkg.highlights.map((h) => (
                          <Badge key={h} variant="muted">
                            {h}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
