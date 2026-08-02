"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { BillingCycle, GatewayKind, Plan } from "@prisma/client";
import { PLAN_CATALOGUE, priceForCycle, type PlanDefinition } from "@/domain/billing/plans";
import { subscribeAction, cancelSubscriptionAction } from "@/features/billing/actions";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { formatCurrency } from "@/shared/lib/utils";

interface PlanPickerProps {
  currentPlan: Plan;
  /** The active subscription's billing cycle, if any (defaults MONTHLY for trial/free). */
  currentBillingCycle?: BillingCycle;
  defaultGateway: GatewayKind;
  /** Plan pre-selected via ?plan= deep link (e.g. from the pricing page). */
  preselect?: string;
}

/**
 * Plan selection + mock checkout modal. Country decides the default gateway;
 * a manual override is always available (PRD rule).
 */
export function PlanPicker({
  currentPlan,
  currentBillingCycle = "MONTHLY",
  defaultGateway,
  preselect,
}: PlanPickerProps) {
  const router = useRouter();
  const paidPlans = PLAN_CATALOGUE.filter((p) => p.paid);
  const [checkout, setCheckout] = useState<PlanDefinition | null>(
    () => paidPlans.find((p) => p.plan === preselect && p.plan !== currentPlan) ?? null,
  );
  const [gateway, setGateway] = useState<GatewayKind>(defaultGateway);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(currentBillingCycle);
  const [submitting, setSubmitting] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  async function confirmCheckout() {
    if (!checkout) return;
    setSubmitting(true);
    const result = await subscribeAction({
      plan: checkout.plan as "STARTER" | "GROWTH" | "SCALE",
      billingCycle,
      gateway,
    });
    setSubmitting(false);
    if (result.ok) {
      toast.success(`You're on ${checkout.name}! Invoice ${result.data.invoiceNumber} issued.`);
      setCheckout(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function confirmCancel() {
    setSubmitting(true);
    const result = await cancelSubscriptionAction();
    setSubmitting(false);
    setCancelOpen(false);
    if (result.ok) {
      toast.success(
        result.data.refunded
          ? "Subscription cancelled — refunded in full (within the 14-day annual window)."
          : "Subscription cancelled — you're on the free tier.",
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const currency = gateway === "RAZORPAY" ? "INR" : "USD";
  const amount = (p: PlanDefinition) =>
    formatCurrency(priceForCycle(p, billingCycle, currency), currency);
  const monthlyEquivalent = (p: PlanDefinition) =>
    billingCycle === "ANNUAL"
      ? formatCurrency(
          Math.round(priceForCycle(p, "ANNUAL", currency) / 12),
          currency,
        )
      : amount(p);

  return (
    <>
      <div className="mb-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setBillingCycle("MONTHLY")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            billingCycle === "MONTHLY" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBillingCycle("ANNUAL")}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            billingCycle === "ANNUAL" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          Annual
          <Badge variant="secondary" className="text-[10px]">
            Save ~17%
          </Badge>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {paidPlans.map((plan) => {
          const isCurrent = plan.plan === currentPlan && billingCycle === currentBillingCycle;
          return (
            <Card key={plan.plan} className={isCurrent ? "border-primary" : undefined}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {isCurrent && <Badge>Current plan</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{plan.blurb}</p>
              </CardHeader>
              <CardContent>
                <p className="mb-3">
                  <span className="text-2xl font-bold">{monthlyEquivalent(plan)}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                  {billingCycle === "ANNUAL" && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      billed {amount(plan)}/year
                    </span>
                  )}
                </p>
                <ul className="mb-4 space-y-1.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                  onClick={() => setCheckout(plan)}
                >
                  {isCurrent ? "Active" : `Choose ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {currentPlan !== "TRIAL" && currentPlan !== "FREE" && (
        <div className="mt-6">
          <Button variant="ghost" className="text-destructive" onClick={() => setCancelOpen(true)}>
            Cancel subscription
          </Button>
        </div>
      )}

      {/* Mock checkout modal */}
      <Dialog open={checkout !== null} onOpenChange={(open) => !open && setCheckout(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout — {checkout?.name}</DialogTitle>
            <DialogDescription>
              Payment gateways run in sandbox mode in this environment; no real charge is made.
            </DialogDescription>
          </DialogHeader>
          {checkout && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">
                    {checkout.name} ({billingCycle === "ANNUAL" ? "annual" : "monthly"})
                  </span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-muted-foreground">Amount due today</span>
                  <span className="font-semibold">{amount(checkout)}</span>
                </div>
                {billingCycle === "ANNUAL" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Full refund if cancelled within 14 days. Non-refundable after that — access
                    continues to the end of your paid year either way.
                  </p>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium">Payment gateway</p>
                <Select value={gateway} onValueChange={(v) => setGateway(v as GatewayKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RAZORPAY">Razorpay (INR)</SelectItem>
                    <SelectItem value="PAYPAL">PayPal (USD)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Pre-selected from your billing country — override any time.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckout(null)} disabled={submitting}>
              Back
            </Button>
            <Button onClick={confirmCheckout} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay {checkout ? amount(checkout) : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel subscription?"
        description="You'll drop to the free tier immediately: masked DMC identity, capped search results, and no quote requests. Your data is untouched."
        confirmLabel="Cancel subscription"
        destructive
        loading={submitting}
        onConfirm={confirmCancel}
      />
    </>
  );
}
