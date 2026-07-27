import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

export const metadata: Metadata = { title: "Reports" };

const REPORTS = [
  {
    kind: "signups",
    title: "Signups",
    description: "Every account with type, plan, country and verification status.",
  },
  {
    kind: "subscriptions",
    title: "Subscriptions",
    description: "Active and historical subscriptions with gateway and billing period.",
  },
  {
    kind: "revenue",
    title: "Revenue",
    description: "All invoices with amount, currency, gateway and status.",
  },
  {
    kind: "verification",
    title: "Verification",
    description: "Verification submissions and review outcomes.",
  },
];

export default async function AdminReportsPage() {
  await requirePermissionPage("platform:reports:export");

  return (
    <>
      <PageHeader title="Reports" description="Download CSV exports generated from live data." />

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.kind}>
            <CardHeader>
              <CardTitle className="text-base">{r.title}</CardTitle>
              <CardDescription>{r.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <a href={`/api/admin/reports/${r.kind}`} download>
                  <Download className="mr-1 h-4 w-4" /> Download CSV
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
