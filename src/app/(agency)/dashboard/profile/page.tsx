import type { Metadata } from "next";
import { requirePermissionPage } from "@/application/auth/session";
import { ProfileVerificationPanel } from "@/features/verification/components/profile-verification-panel";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Profile & verification" };

export default async function AgencyProfilePage() {
  const ctx = await requirePermissionPage("verification:submit");

  return (
    <>
      <PageHeader
        title="Profile & verification"
        description="Your business details and optional verification status."
      />
      <ProfileVerificationPanel ctx={ctx} />
    </>
  );
}
