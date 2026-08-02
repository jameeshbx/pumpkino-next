import Link from "next/link";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import { PLAN_CATALOGUE } from "@/domain/billing/plans";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { formatCurrency } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Simple pricing for agencies</h1>
        <p className="mt-3 text-muted-foreground">
          DMCs join free — always. Agencies get a 7-day full-access trial, no card required.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLAN_CATALOGUE.map((plan) => {
          const highlight = plan.plan === "GROWTH";
          return (
            <Card key={plan.plan} className={highlight ? "border-primary shadow-md" : undefined}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {highlight && <Badge>Popular</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{plan.blurb}</p>
              </CardHeader>
              <CardContent>
                <p className="mb-1">
                  <span className="text-3xl font-bold">{formatCurrency(plan.priceInr)}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </p>
                {plan.paid && (
                  <p className="mb-4 text-xs text-muted-foreground">
                    or save ~17% billed annually — pick your cycle at checkout
                  </p>
                )}
                {!plan.paid && <div className="mb-4" />}
                <ul className="mb-6 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full" variant={highlight ? "default" : "outline"}>
                  <Link href={plan.paid ? `/dashboard/subscription?plan=${plan.plan}` : "/signup?role=agency"}>
                    {plan.paid ? `Choose ${plan.name}` : "Start free trial"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        India is billed in INR via Razorpay; other countries in USD via PayPal. You can override the
        gateway at checkout.
      </p>
    </section>
  );
}
