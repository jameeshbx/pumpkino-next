import type { Metadata } from "next";
import { LegalPage } from "@/shared/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 2026"
      sections={[
        {
          heading: "1. Data we collect",
          body: [
            "Account details (name, email, phone, business information), verification documents you choose to submit, and usage data needed to operate the service.",
          ],
        },
        {
          heading: "2. How we use it",
          body: [
            "To provide the platform, process subscriptions, review verification submissions, prevent abuse, and meet legal obligations. We do not sell personal data.",
          ],
        },
        {
          heading: "3. Security",
          body: [
            "Passwords are stored using bcrypt hashing. Access to production data is restricted and audited. Administrative actions are recorded in an audit log.",
          ],
        },
        {
          heading: "4. Retention & your rights",
          body: [
            "We retain data while your account is active and as required by law. You may request export or deletion of your data via support.",
          ],
        },
      ]}
    />
  );
}
