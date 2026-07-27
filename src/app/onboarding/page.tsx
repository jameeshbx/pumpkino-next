import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, CircleDollarSign, Mail, Store } from "lucide-react";
import { requireAuth } from "@/application/auth/session";
import { isPaidPlan } from "@/domain/billing/plans";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Getting started" };

/**
 * First-login checklist (prototype pumpkino-onboarding.html). Priority order
 * per PRD: verify email → check subscription/trial → explore marketplace →
 * complete profile. "Skip to dashboard" is always available.
 */
export default async function OnboardingPage() {
  const ctx = await requireAuth();
  const isAgency = ctx.accountType === "AGENCY";
  const home = isAgency ? "/dashboard" : "/dmc";
  const profileHref = isAgency ? "/dashboard/profile" : "/dmc/profile";

  const trialDaysLeft = ctx.account?.trialEndsAt
    ? Math.max(0, Math.ceil((ctx.account.trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const steps = [
    {
      icon: Mail,
      title: "Verify your email",
      body: "Confirm the address we send quotes and receipts to. Doesn't block anything.",
      done: ctx.user.emailVerifiedAt !== null,
      href: "/verify-email",
      cta: "Resend / check status",
    },
    ...(isAgency
      ? [
          {
            icon: CircleDollarSign,
            title: "Check your trial & pick a plan",
            body:
              trialDaysLeft !== null
                ? `You have ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} of full access left. Paid plans unlock DMC identity and quote requests.`
                : "Paid plans unlock full DMC identity and quote requests.",
            done: isPaidPlan(ctx.account?.plan ?? "TRIAL"),
            href: "/dashboard/subscription",
            cta: "View plans",
          },
        ]
      : []),
    {
      icon: Store,
      title: "Explore the marketplace",
      body: isAgency
        ? "Browse verified DMCs by destination and service."
        : "See how your listing appears to agencies (listings are curated by our ops team in this phase).",
      done: false,
      href: "/marketplace",
      cta: "Open marketplace",
    },
    {
      icon: BadgeCheck,
      title: "Complete your business profile",
      body: "Submit GSTIN / IATA / registration docs for the verified badge. Optional — never blocks access.",
      done: ctx.account?.verificationStatus === "APPROVED" || ctx.account?.verificationStatus === "SUBMITTED",
      href: profileHref,
      cta: "Open profile",
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <p className="text-4xl">🎃</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Welcome to Pumpkino, {ctx.name.split(" ")[0]}!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is fully active. Here&apos;s a quick checklist to get the most out of it —
          nothing here is required.
        </p>
        <Badge variant="secondary" className="mt-3">
          {completed} of {steps.length} complete
        </Badge>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <Card key={step.title} className={cn(step.done && "opacity-70")}>
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  step.done ? "bg-success/15 text-success" : "bg-primary/10 text-primary",
                )}
              >
                <step.icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", step.done && "line-through")}>{step.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{step.body}</p>
              </div>
              {!step.done && (
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href={step.href}>{step.cta}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Button asChild size="lg">
          <Link href={home}>
            {completed === steps.length ? "Go to dashboard" : "Skip to dashboard"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
