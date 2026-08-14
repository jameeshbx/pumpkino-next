import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { BadgeCheck, Lock, MapPin, Star, Store } from "lucide-react";
import { getAuthContext } from "@/application/auth/session";
import { marketplaceAccess, maskedListingName } from "@/application/marketplace/gate";
import { prisma } from "@/infrastructure/db/prisma";
import { MarketplaceFilters } from "@/features/marketplace/components/marketplace-filters";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { cn } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "DMC Marketplace" };

interface SearchParams {
  q?: string;
  destination?: string;
  service?: string;
  sort?: string;
}

function averageRating(reviews: { rating: number }[]): number | null {
  if (reviews.length === 0) return null;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex text-secondary" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i < full ? "fill-secondary" : "fill-none text-muted")} />
      ))}
    </span>
  );
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await getAuthContext();
  const access = marketplaceAccess(ctx);
  const { q, destination, service, sort } = await searchParams;

  const where: Prisma.DmcListingWhereInput = {
    status: "PUBLISHED",
    ...(destination ? { destinations: { has: destination } } : {}),
    ...(service ? { services: { has: service } } : {}),
    ...(q
      ? {
          OR: [
            // Name only matches for subscribers — mirrors the prototype
            // (unsubscribed search is destination/service-only).
            ...(access.unlocked ? [{ name: { contains: q, mode: "insensitive" as const } }] : []),
            { destinations: { hasSome: [q] } },
            { services: { hasSome: [q] } },
            { city: { contains: q, mode: "insensitive" as const } },
            { country: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const listings = await prisma.dmcListing.findMany({
    where,
    include: { reviews: true },
  });

  const facets = await prisma.dmcListing.findMany({
    where: { status: "PUBLISHED" },
    select: { destinations: true, services: true },
  });
  const destinations = [...new Set(facets.flatMap((f) => f.destinations))].sort();
  const services = [...new Set(facets.flatMap((f) => f.services))].sort();

  const withRating = listings.map((d) => ({ ...d, avgRating: averageRating(d.reviews) }));
  const sorted = withRating.sort((a, b) => {
    if (sort === "bookings") return b.bookings - a.bookings;
    if (sort === "response") return a.responseHrs - b.responseHrs;
    return (b.avgRating ?? 0) - (a.avgRating ?? 0); // default: highest rated
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">DMC Marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find and connect with verified Destination Management Companies across your target markets.
        </p>
      </div>

      <div
        className={cn(
          "mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm",
          access.unlocked
            ? "border-success/30 bg-success/10 text-success"
            : "border-warning/30 bg-warning/10 text-[#8A5A0F] dark:text-warning",
        )}
      >
        <span>
          {access.unlocked ? (
            <>
              <Lock className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              <b className="font-extrabold">Subscribed</b> — DMC names, exact locations and quote
              requests are unlocked.
            </>
          ) : (
            <>
              🔒 <b className="font-extrabold">Not subscribed</b> — you can browse destinations and
              services, but DMC names and quote requests are unlocked only on a paid plan.{" "}
              <Link href="/pricing" className="font-extrabold underline">
                See plans →
              </Link>
            </>
          )}
        </span>
      </div>

      <MarketplaceFilters destinations={destinations} services={services} />

      <p className="mb-4 mt-4 text-xs text-muted-foreground">
        {sorted.length} DMC{sorted.length === 1 ? "" : "s"} found
      </p>

      {sorted.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Store}
          title="No DMCs match those filters"
          description="Try a broader search or clear the filters."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sorted.map((d) => {
            const displayName = access.unlocked ? d.name : maskedListingName(d);
            const location = access.unlocked
              ? `${d.city}, ${d.country} · ${d.destinations.join(", ")}`
              : `${d.country} · ${d.destinations.join(", ")}`;

            return (
              <div key={d.id} className="flex flex-col rounded-xl border border-primary/10 bg-card p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p
                      className={cn(
                        "text-[15px] font-extrabold",
                        access.unlocked ? "text-primary" : "italic text-muted-foreground",
                      )}
                    >
                      {displayName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" aria-hidden /> {location}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold",
                      d.verified ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {d.verified && <BadgeCheck className="mr-0.5 inline h-3 w-3" aria-hidden />}
                    {d.verified ? "Verified" : "Unverified"}
                  </span>
                </div>

                {d.avgRating !== null ? (
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs">
                    <Stars rating={d.avgRating} />
                    <b className="text-primary">{d.avgRating.toFixed(1)}</b>
                    <span className="text-muted-foreground">
                      ({d.reviews.length} review{d.reviews.length === 1 ? "" : "s"})
                    </span>
                  </div>
                ) : (
                  <p className="mb-2.5 text-xs text-muted-foreground">No reviews yet</p>
                )}

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {d.services.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-primary/10 bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <p className="mb-3 flex-1 text-xs leading-relaxed text-muted-foreground">{d.description}</p>

                <div className="mb-3.5 flex flex-wrap gap-3.5 text-[11.5px] text-muted-foreground">
                  <span>
                    <b className="text-primary">{d.bookings}+</b> bookings
                  </span>
                  <span>
                    Responds within <b className="text-primary">{d.responseHrs}h</b>
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/marketplace/${d.id}`}>
                      {access.unlocked ? "View profile & packages" : "View destination details"}
                    </Link>
                  </Button>
                  {access.canSendQuoteRequests ? (
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/marketplace/${d.id}`}>Send quote request</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="secondary" className="flex-1">
                      <Link href="/pricing">
                        <Lock className="mr-1 h-3 w-3" aria-hidden /> Subscribe to unlock
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
