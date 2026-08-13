import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Globe2,
  MapPinned,
  Handshake,
  Wallet,
  LayoutGrid,
  BarChart3,
  Repeat,
  Inbox,
  ListChecks,
  UserPlus,
  Palette,
  Search,
  CheckCircle2,
} from "lucide-react";
import { prisma } from "@/infrastructure/db/prisma";
import { PLAN_CATALOGUE } from "@/domain/billing/plans";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { formatCurrency } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

// "Everything a modern agency runs on" — the prototype's exact six, not a
// trimmed set (pumpkino-home.html "Our value to you").
const VALUE_PROPS = [
  {
    icon: MapPinned,
    title: "AI Itinerary Builder",
    body: "Turn a customer inquiry into a priced, day-by-day itinerary in minutes, not hours.",
  },
  {
    icon: Handshake,
    title: "DMC & Supplier Marketplace",
    body: "Request, compare, and lock in quotes from vetted DMCs and tour operators.",
    href: "/marketplace",
    linkLabel: "Browse marketplace",
  },
  {
    icon: Wallet,
    title: "Payments, Forex & Invoicing",
    body: "Collect global payments via Razorpay or PayPal, track exchange rates, and reconcile GST automatically.",
  },
  {
    icon: LayoutGrid,
    title: "Unified CRM & Pipeline",
    body: "Every lead, conversation, and document lives in one AI-scored pipeline.",
  },
  {
    icon: BarChart3,
    title: "Live Dashboards & Reports",
    body: "Revenue, conversion, and agent performance — updated in real time.",
  },
  {
    icon: Repeat,
    title: "Workflow Automation",
    body: "Auto-assign leads, send follow-ups, and trigger reminders — no manual chasing.",
  },
];

const DMC_PITCH_POINTS = [
  {
    icon: Inbox,
    title: "Receive quote requests instantly",
    body: "New inquiries from agents nationwide arrive in one live queue — no email chasing.",
  },
  {
    icon: Globe2,
    title: "Get listed on the DMC marketplace",
    body: "Your destinations and packages become discoverable to every subscribed agency on Pumpkino.",
  },
  {
    icon: Handshake,
    title: "Manage travel agent relationships",
    body: "See every connected agent, their booking history, and repeat business at a glance.",
  },
  {
    icon: ListChecks,
    title: "Track bookings, payments & invoices",
    body: "Confirmed trips, advance payments, and invoices stay reconciled automatically.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: UserPlus,
    title: "Sign up & start free instantly",
    body: "Register your agency and start your 7-day trial right away — verification is optional and never blocks access.",
  },
  {
    icon: Palette,
    title: "Customize your agency profile",
    body: "Add your logo, brand details, and (whenever ready) submit business documents for verification.",
  },
  {
    icon: MapPinned,
    title: "Manage itinerary requests",
    body: "Inquiries land from WhatsApp or email; draft tailored plans with the AI builder.",
  },
  {
    icon: Search,
    title: "Find DMCs on the marketplace",
    body: "Subscribe to unlock DMC names and send quote requests directly from their profile.",
  },
  {
    icon: CheckCircle2,
    title: "Confirm & track bookings",
    body: "Notify the DMC, track status live, and manage payments through the forex module.",
  },
];

const FAQS = [
  {
    q: "What is Pumpkino for?",
    a: "Pumpkino helps travel agencies create, customize, and manage itineraries while connecting with a marketplace of DMCs and handling bookings and payments in one workspace.",
  },
  {
    q: "Who can see a DMC's name on the marketplace?",
    a: "Anyone can browse destinations and packages for free. Only agencies on a paid subscription can see the DMC's real name, exact location, and send quote requests — this protects DMCs from being contacted outside the platform.",
  },
  {
    q: "Do you support direct bookings with DMCs and suppliers?",
    a: "Yes — request, compare, and confirm quotes from your DMC network without leaving the platform.",
  },
  {
    q: "What payment options are available?",
    a: "Razorpay for India-billed accounts, PayPal for international accounts — plus built-in forex conversion and GST-ready invoicing.",
  },
  {
    q: "Is there a free trial?",
    a: "Every plan includes a 7-day free trial — no credit card required, and business verification is optional and never blocks access.",
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

  const paidPlans = PLAN_CATALOGUE.filter((p) => p.paid);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6">
        <Badge variant="secondary" className="mb-5">
          B2B marketplace for travel agencies & DMCs
        </Badge>
        <h1 className="mx-auto max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Every itinerary, quote, and booking — orchestrated by AI.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Pumpkino unifies leads, AI-drafted itineraries, supplier quotes, and payments into one
          intelligent workspace built for agencies, DMCs, and tour operators.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup?role=agency">
              Start 7-day free trial <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/marketplace">Browse the DMC marketplace →</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">No card required · Full access from day one</p>

        {/* Lead → shared itinerary strip (prototype's "8.42 seconds" demo, static) */}
        <div className="mx-auto mt-14 grid max-w-4xl gap-3 text-left sm:grid-cols-4">
          {[
            {
              n: 1,
              title: "Lead received",
              meta: "via WhatsApp",
              body: "“5N Bali trip, 4 people, honeymoon, ₹2L budget.” — Priya Nair",
            },
            {
              n: 2,
              title: "AI drafts itinerary",
              meta: "auto-priced",
              body: "D1–2 · Ubud villa · D3–4 · Seminyak resort · D5 · Sunset cruise",
            },
            {
              n: 3,
              title: "Agent fine-tunes",
              meta: "one edit",
              body: "Upgraded to ocean villa — ₹1,42,000",
            },
            {
              n: 4,
              title: "Shared with customer",
              meta: "PDF + WhatsApp",
              body: "Bali Honeymoon · 5N/6D — sent to Priya, ₹4,44,000",
            },
          ].map((step) => (
            <div key={step.n} className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {step.n}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {step.meta}
                </span>
              </div>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Lead to shared itinerary in <span className="font-semibold text-foreground">8.42 seconds</span>{" "}
          — no credit card required
        </p>
      </section>

      {/* Value props */}
      <section id="platform" className="scroll-mt-20 border-t bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Our value to you</p>
            <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight">
              Everything a modern agency runs on
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VALUE_PROPS.map((v) => (
              <Card key={v.title}>
                <CardContent className="p-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <v.icon className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <h3 className="font-semibold">{v.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{v.body}</p>
                  {v.href && (
                    <Link
                      href={v.href}
                      className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      {v.linkLabel} →
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* DMC marketplace teaser */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">DMC marketplace</p>
          <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight">
            Find a DMC for any destination, worldwide
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse packages by destination for free. Subscribe to unlock DMC names, exact location and
            direct quote requests.
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
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Package details are always free to browse.
        </p>
        <div className="mt-3 text-center">
          <Button asChild variant="outline">
            <Link href="/marketplace">View the full DMC marketplace →</Link>
          </Button>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing-teaser" className="border-t bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Pricing</p>
            <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight">
              Plans that grow with your agency
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              All plans include a 7-day free trial. Secure payments via Razorpay (India) or PayPal
              (international).
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {paidPlans.map((plan) => (
              <Card key={plan.plan} className={plan.plan === "GROWTH" ? "border-primary" : undefined}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{plan.name}</h3>
                    {plan.plan === "GROWTH" && <Badge>Most popular</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
                  <p className="mt-4">
                    <span className="text-2xl font-bold">{formatCurrency(plan.priceInr)}</span>
                    <span className="text-sm text-muted-foreground"> / month</span>
                  </p>
                  <Button asChild className="mt-4 w-full" variant={plan.plan === "GROWTH" ? "default" : "outline"}>
                    <Link href={`/signup?role=agency`}>Start free trial</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/pricing" className="text-sm font-medium text-primary hover:underline">
              Compare all plan features →
            </Link>
          </div>
        </div>
      </section>

      {/* DMC pitch */}
      <section id="dmc-portal" className="scroll-mt-20 bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Badge variant="secondary" className="mb-4">
            Free for DMCs · No subscription
          </Badge>
          <h2 className="max-w-xl font-serif text-3xl font-bold tracking-tight">
            Win more bookings by responding first.
          </h2>
          <p className="mt-3 max-w-2xl text-primary-foreground/80">
            Every quote request — from Pumpkino agents, direct clients, or your own channels — lands
            in one AI-sorted queue. List your packages on the Pumpkino marketplace and get discovered
            by subscribed agencies searching your destinations.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {DMC_PITCH_POINTS.map((p) => (
              <div key={p.title} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <p.icon className="h-4.5 w-4.5" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="mt-1 text-sm text-primary-foreground/75">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link href="/signup?role=dmc">Join as a DMC — it&apos;s free</Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">How this works</p>
          <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight">
            Create, customize, confirm — in five steps
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {String(i + 1).padStart(2, "0")}
              </div>
              <p className="font-semibold">{step.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t bg-muted/40 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">FAQ</p>
            <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight">
              Got questions? We&apos;ve got answers
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((item) => (
              <details key={item.q} className="group rounded-lg border bg-card p-4">
                <summary className="cursor-pointer list-none font-medium marker:content-none">
                  <span className="flex items-center justify-between">
                    {item.q}
                    <span className="ml-3 shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary py-16 text-center text-primary-foreground">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to supercharge your agency?
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Create, edit & share travel plans in minutes.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/signup?role=agency">Try for free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10"
            >
              <Link href="/support">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
