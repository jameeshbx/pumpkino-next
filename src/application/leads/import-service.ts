import "server-only";
import { randomUUID } from "crypto";
import type { AuthContext } from "@/application/auth/session";
import { prisma } from "@/infrastructure/db/prisma";
import { AUDIT_ACTIONS, recordAudit } from "@/infrastructure/audit/audit-log";
import { ValidationError } from "@/domain/errors";
import { mapRow, normalizeMobile, type ColumnMapping, type ParsedLeadRow } from "@/domain/leads/csv-import";
import type { LeadStage } from "@prisma/client";

export interface ImportPreviewRow extends ParsedLeadRow {
  isDuplicate: boolean;
}

export interface ImportPreview {
  ready: ImportPreviewRow[];
  duplicateCount: number;
  skippedMissingNameCount: number;
}

async function buildDedupSets(accountId: string): Promise<{ mobiles: Set<string>; emails: Set<string> }> {
  const existing = await prisma.lead.findMany({
    where: { accountId },
    select: { mobile: true, email: true },
  });
  const mobiles = new Set(existing.filter((l) => l.mobile).map((l) => normalizeMobile(l.mobile!)));
  const emails = new Set(existing.filter((l) => l.email).map((l) => l.email!.toLowerCase()));
  return { mobiles, emails };
}

/** Preview step — nothing is written to the DB here (PRD: never a silent overwrite). */
export async function previewImport(
  ctx: AuthContext,
  input: {
    headers: string[];
    rawRows: string[][];
    mapping: ColumnMapping;
    stageMapping: Record<string, LeadStage>;
  },
): Promise<ImportPreview> {
  if (!ctx.accountId) throw new ValidationError("No business account attached to this user.");
  const { mobiles, emails } = await buildDedupSets(ctx.accountId);

  let skippedMissingNameCount = 0;
  const ready: ImportPreviewRow[] = [];

  for (const row of input.rawRows) {
    const mapped = mapRow(input.headers, row, input.mapping, input.stageMapping);
    if (!mapped) {
      skippedMissingNameCount++;
      continue;
    }
    const isDuplicate =
      (mapped.mobile !== null && mobiles.has(normalizeMobile(mapped.mobile))) ||
      (mapped.email !== null && emails.has(mapped.email.toLowerCase()));
    ready.push({ ...mapped, isDuplicate });
  }

  return {
    ready,
    duplicateCount: ready.filter((r) => r.isDuplicate).length,
    skippedMissingNameCount,
  };
}

/**
 * Commits the import (CRM Migration Plan Section 4.6). Duplicates are
 * skipped by default — the agent picks "import anyway" for the whole batch
 * by passing includeDuplicates: true, never a silent overwrite.
 */
export async function commitImport(
  ctx: AuthContext,
  input: { rows: ImportPreviewRow[]; includeDuplicates: boolean },
): Promise<{ batchId: string; createdCount: number }> {
  if (!ctx.accountId) throw new ValidationError("No business account attached to this user.");

  const toCreate = input.rows.filter((r) => input.includeDuplicates || !r.isDuplicate);
  if (toCreate.length === 0) throw new ValidationError("Nothing to import.");

  const batchId = randomUUID();
  await prisma.lead.createMany({
    data: toCreate.map((r) => ({
      accountId: ctx.accountId!,
      name: r.name,
      destination: r.destination,
      pax: r.pax,
      mobile: r.mobile,
      email: r.email,
      startDate: r.startDate ? parseFlexibleDate(r.startDate) : null,
      stage: r.stage,
      createdById: ctx.userId,
      importedNotes: r.importedNotes,
      importBatchId: batchId,
    })),
  });

  await recordAudit({
    action: AUDIT_ACTIONS.LEADS_IMPORTED,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    metadata: { importBatchId: batchId, createdCount: toCreate.length },
  });

  return { batchId, createdCount: toCreate.length };
}

/** Undo (CRM Migration Plan: "a single Undo this import button removes exactly the leads created by that import"). */
export async function undoImport(ctx: AuthContext, batchId: string): Promise<{ deletedCount: number }> {
  if (!ctx.accountId) throw new ValidationError("No business account attached to this user.");
  const result = await prisma.lead.deleteMany({
    where: { accountId: ctx.accountId, importBatchId: batchId },
  });

  await recordAudit({
    action: AUDIT_ACTIONS.LEADS_IMPORT_UNDONE,
    actorUserId: ctx.userId,
    accountId: ctx.accountId,
    metadata: { importBatchId: batchId, deletedCount: result.count },
  });

  return { deletedCount: result.count };
}

/** Finds the most recent import batch for the "Undo last import" affordance. */
export async function getLastImportBatch(
  ctx: AuthContext,
): Promise<{ batchId: string; count: number; importedAt: Date } | null> {
  if (!ctx.accountId) return null;
  const latest = await prisma.lead.findFirst({
    where: { accountId: ctx.accountId, importBatchId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { importBatchId: true, createdAt: true },
  });
  if (!latest?.importBatchId) return null;
  const count = await prisma.lead.count({
    where: { accountId: ctx.accountId, importBatchId: latest.importBatchId },
  });
  return { batchId: latest.importBatchId, count, importedAt: latest.createdAt };
}

/** Best-effort date parsing for whatever format the source CRM export used. */
function parseFlexibleDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
