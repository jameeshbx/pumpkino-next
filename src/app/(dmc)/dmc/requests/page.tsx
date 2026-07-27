import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { requirePermissionPage } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { REQUEST_STAGES, REQUEST_STAGE_LABELS } from "@/domain/pipeline/lifecycle";
import { RequestCardActions } from "@/features/quotes/components/request-card-actions";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatCurrency, formatDate } from "@/shared/lib/utils";

export const metadata: Metadata = { title: "Quote requests" };

/**
 * DMC request inbox (prototype "DMC portal"): one column per request stage.
 * Quote IDs appear only after a quote is sent; booking IDs only when paid.
 */
export default async function DmcRequestsPage() {
  const ctx = await requirePermissionPage("quotes:read");

  const requests = await prisma.quoteRequest.findMany({
    where: { dmcAccountId: ctx.accountId!, lifecycleStatus: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  });

  const canManage = ctx.permissions.has("quotes:manage");

  return (
    <>
      <PageHeader
        title="Quote requests"
        description={`${requests.length} active request${requests.length === 1 ? "" : "s"} from travel agencies.`}
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No requests yet"
          description="When agencies find you on the marketplace and request a quote, it lands here."
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {REQUEST_STAGES.map((stage) => {
            const column = requests.filter((r) => r.stage === stage);
            return (
              <section
                key={stage}
                aria-label={REQUEST_STAGE_LABELS[stage]}
                className="w-72 shrink-0 rounded-xl bg-muted/50 p-3"
              >
                <header className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {REQUEST_STAGE_LABELS[stage]}
                  </h2>
                  <Badge variant="muted">{column.length}</Badge>
                </header>
                <div className="space-y-2">
                  {column.map((r) => (
                    <Card key={r.id}>
                      <CardContent className="p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{r.agencyName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {r.destination}
                            {r.pax ? ` · ${r.pax}` : ""}
                            {r.nights ? ` · ${r.nights}N` : ""}
                          </p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          {r.startDate && <span>🗓 {formatDate(r.startDate)}</span>}
                          {r.budget && <span>Budget: {r.budget}</span>}
                          {r.quotedPrice && (
                            <span className="font-medium text-foreground">
                              {formatCurrency(r.quotedPrice)}
                            </span>
                          )}
                        </div>
                        {(r.quoteId ?? r.bookingId) && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {r.quoteId && <Badge variant="muted">{r.quoteId}</Badge>}
                            {r.bookingId && <Badge variant="success">{r.bookingId}</Badge>}
                          </div>
                        )}
                        {r.message && (
                          <p className="mt-1.5 line-clamp-2 rounded bg-muted px-1.5 py-1 text-[11px] text-muted-foreground">
                            {r.message}
                          </p>
                        )}
                        {canManage && (
                          <div className="mt-2">
                            <RequestCardActions
                              requestId={r.id}
                              agencyName={r.agencyName}
                              stage={r.stage}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {column.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">Empty</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
