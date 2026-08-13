import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck, Clock, Lock, MapPin, Star } from "lucide-react";
import { getAuthContext } from "@/application/auth/session";
import { marketplaceAccess, maskedListingName } from "@/application/marketplace/gate";
import { prisma } from "@/infrastructure/db/prisma";
import { QuoteRequestDialog } from "@/features/marketplace/components/quote-request-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatCurrency, formatDate } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "DMC profile" };

export default async function DmcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  const access = marketplaceAccess(ctx);
  const { id } = await params;

  const listing = await prisma.dmcListing.findUnique({
    where: { id },
    include: {
      packages: true,
      reviews: { orderBy: { date: "desc" } },
    },
  });
  if (!listing || listing.status !== "PUBLISHED") notFound();

  const displayName = access.unlocked ? listing.name : maskedListingName(listing);
  const location = access.unlocked ? `${listing.city}, ${listing.country}` : listing.country;
  const avgRating =
    listing.reviews.length > 0
      ? (listing.reviews.reduce((s, r) => s + r.rating, 0) / listing.reviews.length).toFixed(1)
      : null;

  return (
    <>
      <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to marketplace
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className={
                access.unlocked
                  ? "text-2xl font-semibold tracking-tight"
                  : "text-2xl font-medium italic text-muted-foreground"
              }
            >
              {displayName}
            </h1>
            {listing.verified && (
              <Badge variant="success">
                <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Verified
              </Badge>
            )}
          </div>
          <p className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden /> {location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" aria-hidden /> ~{listing.responseHrs}h response
            </span>
            <span>{listing.bookings} bookings</span>
            {avgRating && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-warning text-warning" aria-hidden /> {avgRating}
              </span>
            )}
          </p>
        </div>

        {access.canSendQuoteRequests ? (
          <QuoteRequestDialog
            listingId={listing.id}
            dmcName={displayName}
            defaultDestination={listing.destinations[0] ?? ""}
          />
        ) : ctx?.accountType === "AGENCY" ? (
          <Button asChild variant="outline">
            <Link href="/dashboard/subscription">
              <Lock className="mr-1 h-4 w-4" /> Upgrade to send quote requests
            </Link>
          </Button>
        ) : !ctx ? (
          <Button asChild variant="secondary">
            <Link href="/signup?role=agency">
              <Lock className="mr-1 h-4 w-4" /> Sign up to send quote requests
            </Link>
          </Button>
        ) : null}
      </div>

      <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {listing.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {listing.destinations.map((d) => (
          <Badge key={d} variant="secondary">
            {d}
          </Badge>
        ))}
        {listing.services.map((s) => (
          <Badge key={s} variant="muted">
            {s}
          </Badge>
        ))}
      </div>

      {/* Packages — visible to everyone (PRD: packages visible even when locked) */}
      <h2 className="mb-3 mt-10 text-lg font-semibold">Packages</h2>
      {listing.packages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No packages published yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listing.packages.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {p.dest} · {p.duration}
                </p>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">
                  {formatCurrency(p.price)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{p.unit}</span>
                </p>
                {p.highlights.length > 0 && (
                  <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                    {p.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reviews */}
      <h2 className="mb-3 mt-10 text-lg font-semibold">Agency reviews</h2>
      {listing.reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="space-y-3">
          {listing.reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{r.agency}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={
                            i < r.rating
                              ? "h-3.5 w-3.5 fill-warning text-warning"
                              : "h-3.5 w-3.5 text-muted"
                          }
                          aria-hidden
                        />
                      ))}
                    </span>
                    {formatDate(r.date)}
                  </div>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
