import type { Metadata } from "next";
import { requirePermissionPage } from "@/application/auth/session";
import { TaxSettingsPanel } from "@/features/settings/components/tax-settings-panel";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Settings" };

export default async function DmcSettingsPage() {
  const ctx = await requirePermissionPage("settings:manage");

  return (
    <>
      <PageHeader title="Settings" description="Account-level configuration." />
      <div className="max-w-2xl">
        <TaxSettingsPanel ctx={ctx} />
      </div>
    </>
  );
}
