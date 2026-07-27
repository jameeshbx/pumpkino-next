import { prisma } from "@/infrastructure/db/prisma";
import type { AuthContext } from "@/application/auth/session";
import { taxDefaultsForCountry } from "@/domain/billing/tax";
import { TaxSettingsForm } from "@/features/settings/components/tax-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

export async function TaxSettingsPanel({ ctx }: { ctx: AuthContext }) {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: ctx.accountId! },
    select: { country: true, taxSchemeKey: true, taxRate: true, taxAppliesTo: true },
  });

  const defaults = taxDefaultsForCountry(account.country);
  const current =
    account.taxSchemeKey && account.taxRate !== null && account.taxAppliesTo
      ? {
          schemeKey: account.taxSchemeKey,
          rate: Number(account.taxRate),
          appliesTo: account.taxAppliesTo,
        }
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax settings</CardTitle>
        <CardDescription>
          Pre-filled from your country ({account.country}) — edit anything. These rates flow into
          invoices and markup calculations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TaxSettingsForm defaults={defaults} current={current} />
      </CardContent>
    </Card>
  );
}
