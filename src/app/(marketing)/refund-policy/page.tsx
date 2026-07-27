import type { Metadata } from "next";
import { LegalPage } from "@/shared/components/legal-page";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      updated="July 2026"
      sections={[
        {
          heading: "1. Subscription fees",
          body: [
            "Monthly subscription fees are non-refundable once a billing period has started, except where required by law. You can cancel any time and keep access until the period ends.",
          ],
        },
        {
          heading: "2. Booking cancellations (between agency and customer)",
          body: [
            "Cancellation refunds for trips follow the tiered policy attached to each booking: 100% refund 30+ days before travel, 50% between 7 and 29 days, and no refund under 7 days — unless the agency and DMC agree otherwise.",
          ],
        },
        {
          heading: "3. Disputes",
          body: [
            "If a refund is denied or contested, either party can raise a dispute from their dashboard; Pumpkino's operations team will mediate.",
          ],
        },
      ]}
    />
  );
}
