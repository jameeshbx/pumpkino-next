"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { PLAN_CATALOGUE, annualPriceInr } from "@/domain/billing/plans";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { cn, formatCurrency } from "@/shared/lib/utils";

const PAID_PLANS = PLAN_CATALOGUE.filter((p) => p.paid);

// Feature-comparison matrix (pumpkino-pricing.html "Compare plans in detail").
const COMPARISON_ROWS: { feature: string; values: [string, string, string] }[] = [
  { feature: "Team members", values: ["Up to 3", "Up to 10", "Unlimited"] },
  { feature: "Active leads / month", values: ["50", "Unlimited", "Unlimited"] },
  { feature: "DMC connections", values: ["Up to 5", "Unlimited", "Unlimited"] },
  { feature: "Custom branding on quotes/vouchers", values: ["—", "✓", "✓"] },
  { feature: "WhatsApp automated delivery", values: ["—", "✓", "✓"] },
  { feature: "Analytics dashboard", values: ["—", "✓", "✓"] },
  { feature: "Multi-branch / multi-currency", values: ["—", "—", "✓"] },
  { feature: "API access", values: ["—", "—", "✓"] },
  { feature: "White-label option", values: ["—", "—", "✓"] },
  { feature: "Support", values: ["Email, 48h", "Priority, 12h", "Dedicated AM, 4h SLA"] },
];

export function PricingPlans() {
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-3">
        <span className={cn("text-sm font-semibold", !annual ? "text-primary" : "text-muted-foreground")}>
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          onClick={() => setAnnual((v) => !v)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            annual ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              annual ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          />
        </button>
        <span className={cn("text-sm font-semibold", annual ? "text-primary" : "text-muted-foreground")}>
          Annual
        </span>
        <Badge variant="secondary">Save ~17%</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PAID_PLANS.map((plan) => {
          const highlight = plan.plan === "GROWTH";
          const isScale = plan.plan === "SCALE";
          const monthlyEquivalent = annual ? Math.round(annualPriceInr(plan) / 12) : plan.priceInr;
          return (
            <Card key={plan.plan} className={highlight ? "border-secondary shadow-md" : "border-primary/10"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-primary">{plan.name}</CardTitle>
                  {highlight && <Badge variant="secondary">Most popular</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{plan.blurb}</p>
              </CardHeader>
              <CardContent>
                <p className="mb-1">
                  <span className="text-3xl font-bold text-primary">{formatCurrency(monthlyEquivalent)}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </p>
                <p className="mb-4 text-xs text-muted-foreground">
                  {annual ? `Billed ${formatCurrency(annualPriceInr(plan))}/year` : "Billed monthly · switch to annual and save ~17%"}
                </p>
                <ul className="mb-6 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full" variant={isScale ? "outline" : highlight ? "secondary" : "default"}>
                  <Link href={isScale ? "/support" : "/signup?role=agency"}>
                    {isScale ? "Talk to sales" : "Start free trial"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-16">
        <h2 className="mb-6 text-center text-2xl font-bold text-primary">Compare plans in detail</h2>
        <div className="overflow-x-auto rounded-xl border border-primary/10">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-3 font-semibold text-primary">Feature</th>
                <th className="px-4 py-3 font-semibold text-primary">Starter</th>
                <th className="px-4 py-3 font-semibold text-primary">Growth</th>
                <th className="px-4 py-3 font-semibold text-primary">Scale</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="border-t border-primary/10">
                  <td className="px-4 py-3 font-medium text-primary">{row.feature}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className="px-4 py-3 text-muted-foreground">
                      {v === "—" ? (
                        <Minus className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
                      ) : v === "✓" ? (
                        <Check className="h-4 w-4 text-success" aria-hidden />
                      ) : (
                        v
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
