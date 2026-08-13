import type { Metadata } from "next";
import { LegalPage } from "@/shared/components/legal-page";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      updated="18 July 2026"
      draftNotice="review against actual payment processor terms (Razorpay, PayPal) and consumer protection law in each market before publishing."
      sections={[
        {
          heading: "Free trial — no charge during the trial",
          body: [
            "Every new Travel Agency account includes a 7-day free trial with full Growth-plan features. No payment method is required to start a trial, and nothing is ever charged automatically at the end of it — your account simply moves to the Starter plan unless you choose to subscribe.",
          ],
        },
        {
          heading: "Monthly subscriptions",
          body: [
            "Monthly plans are billed in advance for the upcoming billing cycle. You can cancel anytime from Settings → Subscription; cancellation takes effect at the end of the current billing cycle, and you keep access until then. We do not provide partial refunds for the unused portion of a monthly cycle, except where required by law.",
          ],
        },
        {
          heading: "Annual subscriptions",
          body: [
            "Annual plans are billed in advance for the full year at a discounted rate. If you cancel within 14 days of an annual purchase or renewal, you're eligible for a full refund. After 14 days, annual plans are non-refundable for the remainder of the term, but you keep full access until the term ends.",
          ],
        },
        {
          heading: "Plan changes",
          body: [
            "Upgrading takes effect immediately, with the price difference prorated for the rest of the current cycle. Downgrading takes effect at the start of your next billing cycle, so you keep your current plan's features until then.",
          ],
        },
        {
          heading: "Payment gateway charges",
          body: [
            "Subscriptions are processed via Razorpay (India-billed accounts) or PayPal (international accounts). Any refund is returned to the original payment method through the same gateway; processing time depends on your bank or card issuer and is typically 5–10 business days.",
          ],
        },
        {
          heading: "Bookings between Agencies and DMCs",
          body: [
            "Pumpkino is a marketplace facilitator and is not a party to bookings, itineraries, or payments arranged directly between an Agency and a DMC. Refunds for a specific trip, hotel, or booking are governed by the cancellation terms agreed between the Agency and the DMC (and, where applicable, their supplier), not by this policy. Pumpkino may assist in facilitating communication for a dispute but does not guarantee or process such refunds itself. See the [Terms of Service](/terms) for more on the marketplace-facilitator relationship.",
          ],
        },
        {
          heading: "Requesting a refund",
          body: [
            "To request a refund for your subscription, contact us via the [Support](/support) page with your account email and billing date. We aim to respond within 2 business days.",
          ],
        },
      ]}
    />
  );
}
