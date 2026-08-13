import Link from "next/link";
import type { Metadata } from "next";
import { PricingPlans } from "@/features/billing/components/pricing-plans";

export const metadata: Metadata = { title: "Pricing" };

const FAQS = [
  {
    q: "Do I need a credit card to start the trial?",
    a: "No. Every Travel Agency signup gets 7 days of full Growth-tier access automatically. If you don't choose a plan by the end of the trial, your account softly moves to Starter — your data, leads and DMC connections are kept.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes, upgrade or downgrade anytime from Settings → Subscription. Changes apply immediately and billing is prorated.",
  },
  {
    q: "Do DMCs pay to use Pumpkino?",
    a: "No — DMC/Supplier accounts are free. Subscriptions apply only to Travel Agency accounts sending quote requests and managing bookings.",
  },
  {
    q: "What happens if I go over my plan's limits?",
    a: "You'll see an upgrade prompt at the exact point you hit a limit (e.g. adding a 4th team member on Starter) — nothing is deleted or blocked retroactively.",
  },
];

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-4 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-primary">
          Plans that scale with your agency
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Pick a plan below, or just start your free trial — every new Travel Agency account gets full
          Growth-tier access for 7 days, no card required.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pricing shown is for Travel Agency accounts. DMC / Supplier accounts are always free to join.
        </p>
      </div>

      <div className="mb-10 rounded-xl border border-secondary/30 bg-secondary/10 px-5 py-4 text-center text-sm text-primary">
        🎉 Every plan starts with a 7-day free trial of Growth-tier features. Cancel anytime — no
        automatic charge until you choose to subscribe.
      </div>

      <PricingPlans />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Secure payments via Razorpay (India) or PayPal (international) — billed in your local currency.
      </p>

      <div className="mt-16 border-t border-primary/10 pt-10">
        <h2 className="mb-6 text-center text-2xl font-bold text-primary">Frequently asked questions</h2>
        <div className="mx-auto max-w-3xl space-y-3">
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

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="font-semibold text-primary hover:text-secondary">Log in</Link>
        {" · "}
        Need a DMC account instead?{" "}
        <Link href="/signup?role=dmc" className="font-semibold text-primary hover:text-secondary">
          Sign up as DMC
        </Link>{" "}
        — always free.
      </p>
    </section>
  );
}
