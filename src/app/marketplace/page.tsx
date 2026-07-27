import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { BadgeCheck, Clock, Lock, MapPin, Store } from "lucide-react";
import { requireAuth } from "@/application/auth/session";
import { marketplaceAccess, maskedListingName } from "@/application/marketplace/gate";
import { FREE_TIER_RESULT_CAP } from "@/domain/billing/plans";
import { prisma } from "@/infrastructure/db/prisma";
import { MarketplaceFilters } from "@/features/marketplace/components/marketplace-filters";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";

export const metadata: Metadata = { title: "DMC Marketplace" };

interface SearchParams {
  q?: string;
  country?: string;
  service?: string;
  sort?: string;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireAuth();
  const access = marketplaceAccess(ctx);
  const { q, country, service, sort } = await searchParams;

  const where: Prisma.DmcListingWhereInput = {
    status: "PUBLISHED",
    ...(country ? { country } : {}),
    ...(service ? { services: { has: service } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { country: { contains: q, mode: "insensitive" } },
            { destinations: { hasSome: [q] } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.DmcListingOrderByWithRelationInput =
    sort === "response" ? { responseHrs: "asc" } : sort === "name" ? { name: "asc" } : { bookings: "desc" };

  const listings = await prisma.dmcListing.findMany({ where, orderBy });

  const facets = await prisma.dmcListing.findMany({
    where: { status: "PUBLISHED" },
    select: { country: true, services: true },
  });
  const countries = [...new Set(facets.map((f) => f.country))].sort();
  const services = [...new Set(facets.flatMap((f) => f.services))].sort();

  const visible = access.unlocked ? listings : listings.slice(0, FREE_TIER_RESULT_CAP);
  const lockedCount = access.unlocked ? 0 : Math.max(0, listings.length - FREE_TIER_RESULT_CAP);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">DMC Marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {access.unlocked
            ? "Full access — real names, exact locations, and quote requests."
            : "Browsing free — DMC identities are masked and results capped on trial/free plans."}
        </p>
      </div>

      <MarketplaceFilters countries={countries} services={services} />

      {listings.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Store}
          title="No DMCs match those filters"
          description="Try a broader search or clear the filters."
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((d) => {
            const displayName = access.unlocked ? d.name : maskedListingName(d);
            const location = access.unlocked ? `${d.city}, ${d.country}` : d.country;
            return (
              <Link key={d.id} href={`/marketplace/${d.id}`} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className={
                            access.unlocked
                              ? "font-semibold"
                              : "font-medium italic text-muted-foreground"
                          }
                        >
                          {displayName}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" aria-hidden /> {location}
                        </p>
                      </div>
                      {d.verified && (
                        <Badge variant="success" className="shrink-0">
                          <BadgeCheck className="mr-1 h-3 w-3" /> Verified
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {d.destinations.slice(0, 3).map((dest) => (
                        <Badge key={dest} variant="muted">
                          {dest}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{d.bookings} bookings</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden /> ~{d.responseHrs}h response
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {lockedCount > 0 && (
        <div className="mt-6 rounded-xl border border-dashed p-8 text-center">
          <Lock className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-medium">
            {lockedCount} more DMC{lockedCount === 1 ? "" : "s"} match your search
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paid plans unlock every result with full identity and quote requests.
          </p>
          {ctx.accountType === "AGENCY" && (
            <Button asChild className="mt-4">
              <Link href="/dashboard/subscription">Upgrade to unlock</Link>
            </Button>
          )}
        </div>
      )}
    </>
  );
}
