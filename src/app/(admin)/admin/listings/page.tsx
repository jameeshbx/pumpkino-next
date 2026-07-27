import type { Metadata } from "next";
import { requirePermissionPage } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { ListingStatusToggle } from "@/features/admin/components/listing-status-toggle";
import { PageHeader } from "@/shared/components/page-header";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

export const metadata: Metadata = { title: "Marketplace listings" };

/**
 * Phase-1 listing curation (PRD Section 7: DMC self-serve editing is
 * explicitly deferred — ops curates listings on DMCs' behalf).
 */
export default async function AdminListingsPage() {
  await requirePermissionPage("platform:listings:manage");

  const listings = await prisma.dmcListing.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { packages: true, reviews: true, quoteRequests: true } },
      account: { select: { name: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Marketplace listings"
        description="Ops-curated in phase 1 — publish or unpublish listings. DMC self-serve editing is a deferred phase."
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Listing</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Linked account</TableHead>
            <TableHead>Packages</TableHead>
            <TableHead>Requests</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((l) => (
            <TableRow key={l.id}>
              <TableCell>
                <div className="font-medium">
                  {l.name}
                  {l.verified && (
                    <Badge variant="success" className="ml-2">
                      verified
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{l.destinations.join(", ")}</div>
              </TableCell>
              <TableCell>
                {l.city}, {l.country}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {l.account?.name ?? "Not linked"}
              </TableCell>
              <TableCell>{l._count.packages}</TableCell>
              <TableCell>{l._count.quoteRequests}</TableCell>
              <TableCell>
                <Badge variant={l.status === "PUBLISHED" ? "success" : "muted"}>
                  {l.status.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <ListingStatusToggle listingId={l.id} status={l.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
