import type { Metadata } from "next";
import { LegalPage } from "@/shared/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="18 July 2026"
      draftNotice="this document was generated for a prototype and has not been reviewed by a lawyer. Have qualified legal counsel review and adapt it to your actual jurisdiction, entity structure and business practices before publishing it live."
      sections={[
        {
          heading: "1. Acceptance of terms",
          body: [
            'These Terms of Service ("Terms") govern access to and use of Pumpkino, a platform connecting travel agencies ("Agencies") with Destination Management Companies ("DMCs"), operated by Pumpkino ("Pumpkino", "we", "us"). By creating an account or otherwise using the service, you agree to be bound by these Terms.',
          ],
        },
        {
          heading: "2. Description of service",
          body: [
            "Pumpkino provides tools for Agencies to send quote requests, manage itineraries, bookings and payments, and for DMCs to receive quote requests, manage inventory and track payments. Pumpkino also operates a marketplace directory through which Agencies can discover DMCs, and vice versa.",
          ],
        },
        {
          heading: "3. Accounts & eligibility",
          body: [
            "You must provide accurate information when creating an account and keep your login credentials confidential. You are responsible for all activity under your account. Business verification details (such as GSTIN or industry association membership) are optional at signup and may be added later from your profile; submitting them does not affect your existing trial or subscription, and Pumpkino may independently verify submitted details before marking an account as verified.",
          ],
        },
        {
          heading: "4. The Pumpkino marketplace",
          body: [
            "Pumpkino is a facilitator that connects Agencies and DMCs; we are not a party to any booking, itinerary, or travel arrangement agreed between an Agency and a DMC. Agencies and DMCs are independently responsible for the accuracy of their listings, quotes, itineraries, and the fulfillment of any booking. Reviews and ratings displayed on the marketplace reflect the opinions of the Agency or DMC that submitted them and are not verified or endorsed by Pumpkino. We reserve the right to remove listings, reviews, or accounts that we reasonably believe are fraudulent, abusive, or otherwise violate these Terms.",
          ],
        },
        {
          heading: "5. Subscriptions, trials & payment",
          body: [
            "Travel Agency accounts may start with a free trial period as described at signup. Continued access to trial-tier features after the trial period requires an active paid subscription on one of the published plans. DMC accounts are free to use the marketplace and core DMC tools.",
            "Paid subscriptions are billed in advance on a recurring basis (monthly or annual, as selected) through our payment partners, currently Razorpay (for India-billed accounts) and PayPal (for international accounts). Pumpkino does not store your full card details — these are handled directly by the payment processor. See our [Refund Policy](/refund-policy) for cancellation and refund terms.",
          ],
        },
        {
          heading: "6. Acceptable use",
          list: [
            "Do not use the service to submit false or fraudulent business verification information.",
            "Do not use the marketplace to post misleading listings, fake reviews, or spam.",
            "Do not attempt to circumvent security, rate limits, or access controls.",
            "Do not use the service for any unlawful purpose or in violation of applicable travel trade regulations.",
          ],
        },
        {
          heading: "7. Intellectual property",
          body: [
            "Pumpkino and its logos, design system, and software are the property of Pumpkino. Content you submit (itineraries, listings, reviews) remains yours, but you grant Pumpkino a license to display it within the service for the purpose of operating the marketplace.",
          ],
        },
        {
          heading: "8. Disclaimers & limitation of liability",
          body: [
            'The service is provided "as is" without warranties of any kind. Pumpkino is not liable for losses arising from bookings, itineraries, or disputes between Agencies and DMCs, though we may assist in good-faith dispute resolution at our discretion. To the maximum extent permitted by law, Pumpkino\'s aggregate liability for any claim relating to the service is limited to the amount paid by you in the twelve months preceding the claim.',
          ],
        },
        {
          heading: "9. Termination",
          body: [
            "You may stop using the service and cancel your subscription at any time from Settings. We may suspend or terminate accounts that violate these Terms, engage in fraud, or pose a risk to other users of the marketplace.",
          ],
        },
        {
          heading: "10. Changes to these terms",
          body: [
            "We may update these Terms from time to time. Material changes will be notified in-app or by email before they take effect.",
          ],
        },
        {
          heading: "11. Governing law",
          body: [
            "These Terms are governed by the laws of India, without regard to conflict-of-law principles, subject to the actual jurisdiction Pumpkino is legally established in — to be confirmed by counsel prior to publishing.",
          ],
        },
        {
          heading: "12. Contact",
          body: ["Questions about these Terms can be sent via the [Support](/support) page."],
        },
      ]}
    />
  );
}
