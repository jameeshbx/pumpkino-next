import type { Metadata } from "next";
import { LegalPage } from "@/shared/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="18 July 2026"
      draftNotice="this document was generated for a prototype and has not been reviewed by a lawyer or privacy professional. Before publishing, have it reviewed against applicable law in every market Pumpkino operates in, including India's Digital Personal Data Protection (DPDP) Act and any regional data protection rules relevant to Phase 2/3 markets (GCC, Southeast Asia)."
      sections={[
        {
          heading: "What we collect",
          table: {
            headers: ["Category", "Examples"],
            rows: [
              ["Account information", "Name, email, phone, agency/DMC name, city, state, country"],
              [
                "Business verification (optional)",
                "GSTIN, business registration number, IATA/TAAI/TAFI membership, uploaded documents",
              ],
              ["Booking & marketplace data", "Quote requests, itineraries, bookings, reviews you post"],
              [
                "Payment data",
                "Subscription plan and billing history — full card/bank details are handled by Razorpay or PayPal directly and are not stored by Pumpkino",
              ],
              ["Usage data", "Login activity, feature usage, device/browser information"],
            ],
          },
        },
        {
          heading: "How we use it",
          list: [
            "To operate your account, process quote requests, and run the marketplace.",
            "To process subscription billing through Razorpay or PayPal.",
            "To review business verification submissions and display a verified badge where approved.",
            "To send service communications (trial status, booking updates, verification outcomes) and, where you have opted in, marketing communications.",
            "To improve the product and investigate misuse, fraud, or disputes.",
          ],
        },
        {
          heading: "Who we share it with",
          body: [
            "Booking-relevant details (traveler names, dates, requirements) are necessarily shared between the Agency and DMC involved in a given quote request or booking. Payment details are shared with Razorpay and/or PayPal solely to process your subscription. We do not sell personal data to third parties.",
          ],
        },
        {
          heading: "International data transfer",
          body: [
            "As Pumpkino expands to agencies and DMCs outside India (UAE, Southeast Asia and beyond), data may be processed or stored in different countries. Where required, we will put appropriate safeguards in place for cross-border transfer.",
          ],
        },
        {
          heading: "Data retention",
          body: [
            "We retain account and booking data for as long as your account is active, and for a reasonable period afterward to meet legal, accounting, or dispute-resolution obligations.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You can access, correct, or request deletion of your personal data, and withdraw marketing consent at any time, by contacting us through the [Support](/support) page. Business verification documents can be updated or resubmitted anytime from your Profile.",
          ],
        },
        {
          heading: "Cookies",
          body: [
            "Pumpkino uses cookies/local storage for session management and basic analytics. No third-party advertising cookies are used.",
          ],
        },
        {
          heading: "Grievance / Data Protection Contact",
          body: [
            "For privacy questions or to exercise your data rights, reach us via the [Support](/support) page. (A named Grievance Officer, as may be required under applicable law, should be designated before this policy is published live.)",
          ],
        },
      ]}
    />
  );
}
