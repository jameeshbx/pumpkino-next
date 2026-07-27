import type { Metadata } from "next";
import { Flag } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { DisputePanel } from "@/features/admin/components/dispute-panel";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatDate } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Disputes" };

export default async function AdminDisputesPage() {
  await requirePermissionPage("platform:disputes:manage");

  const disputes = await prisma.dispute.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      agencyAccount: { select: { name: true } },
      dmcAccount: { select: { name: true } },
      notes: { orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <>
      <PageHeader
        title="Disputes"
        description="Mediation between agencies and DMCs — refund disagreements, service issues."
      />

      {disputes.length === 0 ? (
        <EmptyState icon={Flag} title="No disputes" description="Nothing needs mediation right now." />
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{d.subject}</CardTitle>
                  <Badge variant={d.status === "OPEN" ? "warning" : "success"}>
                    {d.status.toLowerCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {d.agencyAccount?.name ?? "Agency"} ↔ {d.dmcAccount?.name ?? "DMC"} · raised by{" "}
                  {d.raisedBy} · {formatDate(d.createdAt)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {d.notes.length > 0 && (
                  <ol className="space-y-2 border-l-2 pl-4">
                    {d.notes.map((n) => (
                      <li key={n.id} className="text-sm">
                        <span className="font-medium">{n.author}</span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(n.createdAt)}
                        </span>
                        <p className="text-muted-foreground">{n.body}</p>
                      </li>
                    ))}
                  </ol>
                )}
                <DisputePanel disputeId={d.id} status={d.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
