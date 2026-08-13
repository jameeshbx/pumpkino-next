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
// trimmed set (pumpkino-home.html "Our value to you"). Icon tint alternates
// gold/green per item, matching the prototype's ✦◈◎▤◐⟲ tile treatment.
const VALUE_PROPS = [
  {
    icon: MapPinned,
    title: "AI Itinerary Builder",
    body: "Turn a customer inquiry into a priced, day-by-day itinerary in minutes, not hours.",
    tint: "gold" as const,
  },
  {
    icon: Handshake,
    title: "DMC & Supplier Marketplace",
    body: "Request, compare, and lock in quotes from vetted DMCs and tour operators.",
    href: "/marketplace",
    linkLabel: "Browse marketplace",
    tint: "green" as const,
  },
  {
    icon: Wallet,
    title: "Payments, Forex & Invoicing",
    body: "Collect global payments via Razorpay or PayPal, track exchange rates, and reconcile GST automatically.",
    tint: "gold" as const,
  },
  {
    icon: LayoutGrid,
    title: "Unified CRM & Pipeline",
    body: "Every lead, conversation, and document lives in one AI-scored pipeline.",
    tint: "green" as const,
  },
  {
    icon: BarChart3,
    title: "Live Dashboards & Reports",
    body: "Revenue, conversion, and agent performance — updated in real time.",
    tint: "gold" as const,
  },
  {
    icon: Repeat,
    title: "Workflow Automation",
    body: "Auto-assign leads, send follow-ups, and trigger reminders — no manual chasing.",
    tint: "green" as const,
  },
];

const DEMO_STEPS = [
  {
    n: 1,
    title: "Lead received",
    meta: "0.00s · via WhatsApp",
    kind: "quote" as const,
    text: '"5N Bali trip, 4 people, honeymoon, ₹2L budget."',
    sub: "Priya Nair",
  },
  {
    n: 2,
    title: "AI drafts itinerary",
    meta: "4.10s · auto-priced",
    kind: "lines" as const,
    lines: ["D1–2 · Ubud villa", "D3–4 · Seminyak resort", "D5 · Sunset cruise"],
  },
  {
    n: 3,
    title: "Agent fine-tunes",
    meta: "7.05s · one edit",
    kind: "price" as const,
    was: "Seminyak resort · ₹1,10,000",
    now: "Upgraded to ocean villa",
    price: "₹1,42,000",
  },
  {
    n: "✓",
    title: "Shared with customer",
    meta: "8.42s · PDF + WhatsApp",
    kind: "final" as const,
    label: "Bali Honeymoon · 5N/6D",
    sub: "Sent to Priya",
    price: "₹4,44,000",
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
        <Badge className="mb-5 gap-1.5 rounded-full border-primary/15 bg-primary/[0.06] px-3.5 py-1.5 text-[12.5px] font-semibold tracking-wide text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden />
          The operating system for travel operations
        </Badge>
        <h1 className="mx-auto max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Every itinerary, quote, and booking — orchestrated by AI.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Pumpkino unifies leads, AI-drafted itineraries, supplier quotes, and payments into one
          intelligent workspace built for agencies, DMCs, and tour operators.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link href="/signup?role=agency">
              Start 7-day free trial <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/marketplace">Browse the DMC marketplace →</Link>
          </Button>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          <span className="text-secondary">⚡</span> Lead to shared itinerary in{" "}
          <span className="rounded-md bg-secondary px-2 py-0.5 font-extrabold text-secondary-foreground">
            8.42 seconds
          </span>{" "}
          — no credit card required
        </p>

        {/* Lead → shared itinerary timeline (prototype's animated demo, static) */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="mb-11 flex items-baseline justify-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total elapsed time
            </span>
            <span className="font-serif text-3xl font-bold text-primary">
              8.42<span className="text-base font-semibold text-secondary">s</span>
            </span>
          </div>
          <div className="relative grid grid-cols-2 gap-x-4 gap-y-10 px-2 sm:grid-cols-4 sm:gap-x-0">
            <div className="absolute inset-x-[12%] top-5 hidden h-0.5 bg-gradient-to-r from-primary via-secondary to-primary sm:block" />
            {DEMO_STEPS.map((step) => (
              <div key={step.title} className="flex flex-col items-center gap-4 px-3.5 text-left">
                <div
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-background text-[15px] font-bold ${
                    step.kind === "final" ? "bg-secondary text-secondary-foreground" : "bg-primary text-secondary"
                  }`}
                >
                  {step.n}
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-primary">{step.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.meta}</p>
                </div>
                {step.kind === "quote" && (
                  <div className="w-full rounded-xl border bg-card p-3">
                    <div className="rounded-lg rounded-bl-sm bg-muted p-2.5 text-[11.5px] leading-relaxed">
                      {step.text}
                    </div>
                    <div className="mt-1.5 text-[10px] text-muted-foreground">{step.sub}</div>
                  </div>
                )}
                {step.kind === "lines" && (
                  <div className="flex w-full flex-col gap-1.5 rounded-xl border bg-card p-3">
                    {step.lines.map((line) => (
                      <div key={line} className="rounded-md bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-primary">
                        {line}
                      </div>
                    ))}
                  </div>
                )}
                {step.kind === "price" && (
                  <div className="w-full rounded-xl border bg-card p-3">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{step.was.split(" · ")[0]}</span>
                      <span className="line-through">{step.was.split(" · ")[1]}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-primary">
                      <span>{step.now}</span>
                      <span>{step.price}</span>
                    </div>
                  </div>
                )}
                {step.kind === "final" && (
                  <div className="w-full rounded-xl bg-primary p-3">
                    <div className="text-xs font-bold text-primary-foreground">{step.label}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10.5px] text-primary-foreground/70">{step.sub}</span>
                      <span className="text-sm font-bold text-secondary">{step.price}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section id="platform" className="scroll-mt-20 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Our value to you</p>
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-primary">
              Everything a modern agency runs on
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VALUE_PROPS.map((v) => (
              <Card key={v.title} className="border-primary/10">
                <CardContent className="p-7">
                  <div
                    className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl ${
                      v.tint === "gold" ? "bg-secondary/15" : "bg-primary/[0.07]"
                    }`}
                  >
                    <v.icon className={`h-5 w-5 ${v.tint === "gold" ? "text-secondary" : "text-primary"}`} aria-hidden />
                  </div>
                  <h3 className="text-[16.5px] font-bold text-primary">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
                  {v.href && (
                    <Link
                      href={v.href}
                      className="mt-2 inline-block text-sm font-semibold text-primary hover:text-secondary"
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
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">DMC marketplace</p>
          <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-primary">
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
      <section id="pricing-teaser" className="bg-muted/60 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Pricing</p>
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-primary">
              Plans that grow with your agency
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              All plans include a 7-day free trial. Secure payments via Razorpay (India) or PayPal
              (international).
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {paidPlans.map((plan) => (
              <Card key={plan.plan} className={plan.plan === "GROWTH" ? "border-secondary" : "border-primary/10"}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-primary">{plan.name}</h3>
                    {plan.plan === "GROWTH" && <Badge variant="secondary">Most popular</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
                  <p className="mt-4">
                    <span className="text-2xl font-bold text-primary">{formatCurrency(plan.priceInr)}</span>
                    <span className="text-sm text-muted-foreground"> / month</span>
                  </p>
                  <Button
                    asChild
                    className="mt-4 w-full"
                    variant={plan.plan === "GROWTH" ? "secondary" : "outline"}
                  >
                    <Link href={`/signup?role=agency`}>Start free trial</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/pricing" className="text-sm font-semibold text-primary hover:text-secondary">
              Compare all plan features →
            </Link>
          </div>
        </div>
      </section>

      {/* DMC pitch */}
      <section id="dmc-portal" className="scroll-mt-20 bg-primary py-16 text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-16 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <Badge className="mb-4 gap-1.5 rounded-full border-transparent bg-secondary px-3.5 py-1.5 text-[11.5px] font-bold tracking-wide text-secondary-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              Free for DMCs · No subscription
            </Badge>
            <h2 className="max-w-xl font-serif text-3xl font-bold tracking-tight">
              Win more bookings by responding first.
            </h2>
            <p className="mt-3 max-w-2xl text-primary-foreground/75">
              Every quote request — from Pumpkino agents, direct clients, or your own channels — lands
              in one AI-sorted queue. List your packages on the Pumpkino marketplace and get discovered
              by subscribed agencies searching your destinations.
            </p>
            <div className="mt-7 flex flex-col gap-4">
              {DMC_PITCH_POINTS.map((p) => (
                <div key={p.title} className="flex gap-3.5">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-secondary" aria-hidden />
                  <div>
                    <p className="text-[14.5px] font-bold">{p.title}</p>
                    <p className="mt-0.5 text-[13.5px] text-primary-foreground/65">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button asChild size="lg" variant="secondary" className="mt-7">
              <Link href="/signup?role=dmc">Join as a DMC — it&apos;s free</Link>
            </Button>
          </div>

          {/* DMC dashboard preview (pumpkino-home.html "Good morning, Meridian DMC Group" widget) */}
          <div className="rounded-2xl bg-muted p-5 shadow-2xl">
            <p className="font-serif text-base font-bold text-primary">Good morning, Meridian DMC Group</p>
            <p className="mt-0.5 text-xs text-muted-foreground">3 quote requests awaiting response</p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-primary p-4">
              <div>
                <p className="text-[10.5px] font-bold tracking-wide text-primary-foreground/60">
                  AVG. QUOTE RESPONSE TIME
                </p>
                <p className="mt-1 text-2xl font-bold text-primary-foreground">3h 40m</p>
                <p className="mt-0.5 text-[11px] text-primary-foreground/55">Industry benchmark is 24h+</p>
              </div>
              <span className="whitespace-nowrap rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold text-secondary-foreground">
                Beating average
              </span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                ["PENDING", "3"],
                ["QUOTES SENT", "1"],
                ["INVENTORY", "9"],
                ["AGENTS", "2"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-card p-2.5">
                  <p className="text-[9.5px] font-bold text-muted-foreground">{label}</p>
                  <p className="text-[17px] font-bold text-primary">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2.5">
              {[
                { tag: "NEW REQUEST · 2", name: "Lucas Ferreira", detail: "Munnar · 3N · Family of 4" },
                { tag: "QUOTE SENT · 1", name: "Arjun Menon", detail: "Kumarakom · ₹38,000" },
                { tag: "PAYMENT PENDING · 1", name: "Sneha Rao", detail: "Munnar · ₹21,500" },
              ].map((row) => (
                <div key={row.name} className="flex flex-col gap-1.5 rounded-lg bg-card p-2.5">
                  <p className="text-[10px] font-bold text-muted-foreground">{row.tag}</p>
                  <div className="rounded-md bg-muted p-2">
                    <p className="text-[11.5px] font-bold text-primary">{row.name}</p>
                    <p className="text-[10px] text-muted-foreground">{row.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary">How this works</p>
          <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-primary">
            Create, customize, confirm — in five steps
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-secondary">
                {String(i + 1).padStart(2, "0")}
              </div>
              <p className="font-bold text-primary">{step.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-muted/60 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">FAQ</p>
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-primary">
              Got questions? We&apos;ve got answers
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((item) => (
              <details key={item.q} className="group rounded-xl border border-primary/10 bg-card p-4.5">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-primary marker:content-none">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span className="shrink-0 text-secondary transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
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
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-white/10"
            >
              <Link href="/support">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
