"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { LeadStage } from "@prisma/client";
import {
  IMPORT_TARGET_FIELDS,
  guessColumnMapping,
  guessStageFor,
  parseCsv,
  type ColumnMapping,
  type ImportTargetField,
} from "@/domain/leads/csv-import";
import { LEAD_STAGE_LABELS } from "@/domain/pipeline/lifecycle";
import type { ImportPreviewRow } from "@/application/leads/import-service";
import {
  commitImportAction,
  previewImportAction,
} from "@/features/leads/actions";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

const FIELD_LABELS: Record<ImportTargetField, string> = {
  name: "Name",
  mobile: "Mobile",
  email: "Email",
  destination: "Destination",
  pax: "Pax",
  startDate: "Travel date",
  stage: "Stage",
};

type Step = "paste" | "mapping" | "stageMapping" | "preview" | "done";

/**
 * CSV/pasted-text lead import (CRM Migration Plan Section 4). Nothing is
 * written to the pipeline until the agent explicitly confirms in the
 * preview step — matching the reversible-by-default philosophy already
 * used elsewhere in this app (reopenLead, undoImport here included).
 */
export function ImportLeadsDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("paste");
  const [pasted, setPasted] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [distinctStageValues, setDistinctStageValues] = useState<string[]>([]);
  const [stageMapping, setStageMapping] = useState<Record<string, LeadStage>>({});
  const [preview, setPreview] = useState<{
    ready: ImportPreviewRow[];
    duplicateCount: number;
    skippedMissingNameCount: number;
  } | null>(null);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<{ batchId: string; createdCount: number } | null>(null);

  function reset() {
    setStep("paste");
    setPasted("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setDistinctStageValues([]);
    setStageMapping({});
    setPreview(null);
    setIncludeDuplicates(false);
    setLastResult(null);
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setPasted(text);
    parseAndContinue(text);
  }

  function parseAndContinue(text: string) {
    const { headers: h, rows } = parseCsv(text);
    if (h.length === 0 || rows.length === 0) {
      toast.error("Couldn't find any rows — check the pasted text or file.");
      return;
    }
    setHeaders(h);
    setRawRows(rows);
    setMapping(guessColumnMapping(h));
    setStep("mapping");
  }

  function goToStageMappingOrPreview() {
    const stageHeader = mapping.stage;
    if (!stageHeader) {
      void runPreview(mapping, {});
      return;
    }
    const idx = headers.indexOf(stageHeader);
    const values = Array.from(new Set(rawRows.map((r) => (r[idx] ?? "").trim()).filter(Boolean)));
    if (values.length === 0) {
      void runPreview(mapping, {});
      return;
    }
    setDistinctStageValues(values);
    const guessed: Record<string, LeadStage> = {};
    for (const v of values) guessed[v] = guessStageFor(v);
    setStageMapping(guessed);
    setStep("stageMapping");
  }

  async function runPreview(m: ColumnMapping, sm: Record<string, LeadStage>) {
    setBusy(true);
    const result = await previewImportAction({ headers, rawRows, mapping: m, stageMapping: sm });
    setBusy(false);
    if (result.ok) {
      setPreview(result.data);
      setStep("preview");
    } else {
      toast.error(result.error);
    }
  }

  async function confirmCommit() {
    if (!preview) return;
    setBusy(true);
    const result = await commitImportAction({ rows: preview.ready, includeDuplicates });
    setBusy(false);
    if (result.ok) {
      setLastResult(result.data);
      setStep("done");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const readyToImportCount = preview
    ? includeDuplicates
      ? preview.ready.length
      : preview.ready.length - preview.duplicateCount
    : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-1.5 h-4 w-4" /> Import leads
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import leads from CSV</DialogTitle>
          <DialogDescription>
            From Zoho, LeadSquared, Kapture, Freshsales, or a plain spreadsheet — upload a file or
            paste rows directly.
          </DialogDescription>
        </DialogHeader>

        {step === "paste" && (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/40">
              <Upload className="mr-2 h-4 w-4" /> Click to choose a .csv file
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </label>
            <p className="text-center text-xs text-muted-foreground">— or paste rows below —</p>
            <Textarea
              rows={8}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={"Name,Mobile,Email,Destination\nNandu,9845011223,nandu@email.com,Munnar"}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => parseAndContinue(pasted)} disabled={!pasted.trim()}>
                Next: map columns
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {rawRows.length} row{rawRows.length === 1 ? "" : "s"} found. Confirm what each column
              means — obvious matches are pre-filled.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {IMPORT_TARGET_FIELDS.map((field) => (
                <div key={field}>
                  <label className="mb-1.5 block text-sm font-medium">
                    {FIELD_LABELS[field]}
                    {field === "name" && <span className="text-destructive"> *</span>}
                  </label>
                  <Select
                    value={mapping[field] ?? "__none__"}
                    onValueChange={(v) =>
                      setMapping((prev) => ({ ...prev, [field]: v === "__none__" ? undefined : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not in this file</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("paste")}>
                Back
              </Button>
              <Button onClick={goToStageMappingOrPreview} disabled={!mapping.name || busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Next
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "stageMapping" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map each status value from the source file to a Pumpkino stage.
            </p>
            <div className="space-y-2">
              {distinctStageValues.map((v) => (
                <div key={v} className="flex items-center gap-3">
                  <span className="flex-1 truncate text-sm font-medium">{v}</span>
                  <Select
                    value={stageMapping[v]}
                    onValueChange={(val) =>
                      setStageMapping((prev) => ({ ...prev, [v]: val as LeadStage }))
                    }
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(LEAD_STAGE_LABELS) as LeadStage[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {LEAD_STAGE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button onClick={() => runPreview(mapping, stageMapping)} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Preview import
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{readyToImportCount}</div>
                <div className="text-xs text-muted-foreground">ready to import</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{preview.duplicateCount}</div>
                <div className="text-xs text-muted-foreground">possible duplicates</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{preview.skippedMissingNameCount}</div>
                <div className="text-xs text-muted-foreground">skipped (no name)</div>
              </div>
            </div>

            {preview.duplicateCount > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={includeDuplicates}
                  onCheckedChange={(c) => setIncludeDuplicates(c === true)}
                />
                Import duplicates anyway, as new separate leads
              </label>
            )}

            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.ready.slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.destination}</TableCell>
                      <TableCell>{LEAD_STAGE_LABELS[r.stage]}</TableCell>
                      <TableCell>
                        {r.isDuplicate && (
                          <Badge variant="warning" className="text-[10px]">
                            possible duplicate
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(mapping.stage ? "stageMapping" : "mapping")}>
                Back
              </Button>
              <Button onClick={confirmCommit} disabled={busy || readyToImportCount === 0}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {readyToImportCount} lead{readyToImportCount === 1 ? "" : "s"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && lastResult && (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm">
              Imported <span className="font-semibold">{lastResult.createdCount}</span> lead
              {lastResult.createdCount === 1 ? "" : "s"} into your pipeline.
            </p>
            <DialogFooter className="sm:justify-center">
              <Button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
