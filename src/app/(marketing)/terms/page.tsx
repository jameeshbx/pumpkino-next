import type { Metadata } from "next";
import { LegalPage } from "@/shared/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="July 2026"
      sections={[
        {
          heading: "1. The service",
          body: [
            "Pumpkino provides a B2B software platform connecting travel agencies with destination management companies (DMCs). Pumpkino is not a party to bookings arranged between agencies and DMCs.",
          ],
        },
        {
          heading: "2. Accounts",
          body: [
            "You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. Accounts may be suspended for breach of these terms.",
          ],
        },
        {
          heading: "3. Subscriptions",
          body: [
            "Agency subscriptions renew monthly until cancelled. DMC accounts are free. Trials last 7 days and require no payment method.",
          ],
        },
        {
          heading: "4. Acceptable use",
          body: [
            "You may not misuse the platform, attempt to access other customers' data, or use the marketplace to send unsolicited communications.",
          ],
        },
        {
          heading: "5. Liability",
          body: [
            "The platform is provided \"as is\". To the maximum extent permitted by law, Pumpkino's liability is limited to the fees paid in the preceding 12 months.",
          ],
        },
      ]}
    />
  );
}
