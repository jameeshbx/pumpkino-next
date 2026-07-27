import { NextResponse } from "next/server";
import { getAuthContext } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { toCsv, csvResponseInit } from "@/shared/lib/csv";
import { formatDate } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

const KINDS = ["signups", "subscriptions", "revenue", "verification"] as const;
type Kind = (typeof KINDS)[number];

/**
 * Admin CSV report export (PRD "Admin reporting"). Server-generated (unlike
 * the prototype's client Blob) so exports reflect live data and access is
 * permission-checked and logged.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.permissions.has("platform:reports:export")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { kind } = await params;
  if (!KINDS.includes(kind as Kind)) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);

  switch (kind as Kind) {
    case "signups": {
      const accounts = await prisma.account.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          name: true,
          type: true,
          email: true,
          country: true,
          plan: true,
          verificationStatus: true,
          createdAt: true,
        },
      });
      const csv = toCsv(
        ["Name", "Type", "Email", "Country", "Plan", "Verification", "Joined"],
        accounts.map((a) => [
          a.name,
          a.type,
          a.email,
          a.country,
          a.plan,
          a.verificationStatus,
          formatDate(a.createdAt),
        ]),
      );
      return new NextResponse(csv, csvResponseInit(`pumpkino-signups-${today}.csv`));
    }
    case "subscriptions": {
      const subs = await prisma.subscription.findMany({
        orderBy: { startedAt: "desc" },
        include: { account: { select: { name: true, country: true } } },
      });
      const csv = toCsv(
        ["Account", "Country", "Plan", "Status", "Gateway", "Amount", "Currency", "Started", "Period end"],
        subs.map((s) => [
          s.account.name,
          s.account.country,
          s.plan,
          s.status,
          s.gateway,
          s.amount,
          s.currency,
          formatDate(s.startedAt),
          formatDate(s.currentPeriodEnd),
        ]),
      );
      return new NextResponse(csv, csvResponseInit(`pumpkino-subscriptions-${today}.csv`));
    }
    case "revenue": {
      const invoices = await prisma.invoice.findMany({
        orderBy: { issuedAt: "desc" },
        include: { account: { select: { name: true } } },
      });
      const csv = toCsv(
        ["Invoice", "Account", "Description", "Amount", "Currency", "Gateway", "Status", "Issued"],
        invoices.map((i) => [
          i.number,
          i.account.name,
          i.description,
          i.amount,
          i.currency,
          i.gateway,
          i.status,
          formatDate(i.issuedAt),
        ]),
      );
      return new NextResponse(csv, csvResponseInit(`pumpkino-revenue-${today}.csv`));
    }
    case "verification": {
      const submissions = await prisma.verificationSubmission.findMany({
        orderBy: { submittedAt: "desc" },
        include: { account: { select: { name: true, type: true } } },
      });
      const csv = toCsv(
        ["Account", "Type", "Status", "GSTIN", "IATA", "Biz reg", "Submitted", "Reviewed"],
        submissions.map((s) => [
          s.account.name,
          s.account.type,
          s.status,
          s.gstin,
          s.iata,
          s.bizReg,
          formatDate(s.submittedAt),
          s.reviewedAt ? formatDate(s.reviewedAt) : "",
        ]),
      );
      return new NextResponse(csv, csvResponseInit(`pumpkino-verification-${today}.csv`));
    }
  }
}
