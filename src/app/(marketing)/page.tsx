import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock, Globe2, Handshake, Search, ShieldCheck } from "lucide-react";
import { prisma } from "@/infrastructure/db/prisma";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";

export const dynamic = "force-dynamic";

const VALUE_PROPS = [
  {
    icon: Search,
    title: "Find verified DMCs fast",
    body: "Search a curated directory of destination management companies by destination, service, and response time.",
  },
  {
    icon: Handshake,
    title: "Quotes in one pipeline",
    body: "Send quote requests, log every DMC response, compare offers and pick a winner — no more WhatsApp archaeology.",
  },
  {
    icon: ShieldCheck,
    title: "Verified partners",
    body: "Business verification with GSTIN / IATA / registration checks, reviewed by our operations team.",
  },
  {
    icon: Clock,
    title: "A CRM built for travel",
    body: "Leads, itineraries, markups, payments, and invoices in one board that mirrors how agencies actually work.",
  },
];

export default async function HomePage() {
  // DMC teaser — masked identity for the public, matching the marketplace gate.
  const teaser = await prisma.dmcListing
    .findMany({
      where: { status: "PUBLISHED" },
      orderBy: { bookings: "desc" },
      take: 3,
      select: { id: true, verified: true, destinations: true, country: true, responseHrs: true },
    })
    .catch(() => []);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6">
        <Badge variant="secondary" className="mb-5">
          B2B marketplace for travel agencies & DMCs
        </Badge>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Every itinerary, quote, and booking — in one pipeline.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Pumpkino connects travel agencies with trusted destination management companies. Search
          the marketplace, request quotes, and run your whole booking funnel from a single
          dashboard.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup?role=agency">
              Start 7-day free trial <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/signup?role=dmc">Join as a DMC — free</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">No card required · Full access from day one</p>
      </section>

      {/* Value props */}
      <section className="border-t bg-muted/40 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {VALUE_PROPS.map((v) => (
            <Card key={v.title}>
              <CardContent className="p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <v.icon className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <h3 className="font-semibold">{v.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{v.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* DMC teaser */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">The DMC marketplace</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse freely on any plan. Paid plans unlock full DMC identity and quote requests.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {teaser.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  {d.verified && <BadgeCheck className="h-4 w-4 text-success" aria-hidden />}
                  <span className="font-medium italic text-muted-foreground">
                    {d.verified ? "✓ Verified DMC" : "DMC"} — {d.destinations[0] ?? d.country}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Globe2 className="h-3.5 w-3.5" aria-hidden /> {d.country}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden /> replies in ~{d.responseHrs}h
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link href="/marketplace">Explore the marketplace</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
