"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { getLastImportBatchAction, undoImportAction } from "@/features/leads/actions";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { formatDate } from "@/shared/lib/utils";

/** Surfaces "Undo last import" only when there's a real recent batch to undo. */
export function UndoImportButton() {
  const router = useRouter();
  const [batch, setBatch] = useState<{ batchId: string; count: number; importedAt: Date } | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getLastImportBatchAction().then((result) => {
      if (result.ok && result.data) setBatch(result.data);
    });
  }, []);

  if (!batch) return null;

  async function confirmUndo() {
    setBusy(true);
    const result = await undoImportAction({ batchId: batch!.batchId });
    setBusy(false);
    setOpen(false);
    if (result.ok) {
      toast.success(`Removed ${result.data.deletedCount} imported lead${result.data.deletedCount === 1 ? "" : "s"}.`);
      setBatch(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <Undo2 className="mr-1.5 h-3.5 w-3.5" />
        Undo last import ({batch.count} on {formatDate(batch.importedAt)})
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Undo last import?"
        description={`This removes exactly the ${batch.count} lead${batch.count === 1 ? "" : "s"} created by that import. Anything you've since edited or moved through the pipeline is removed too — this can't be undone.`}
        confirmLabel="Undo import"
        destructive
        loading={busy}
        onConfirm={confirmUndo}
      />
    </>
  );
}
