"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reopenLeadAction, setRefundStatusAction } from "@/features/leads/actions";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";

type EditableRefund = "PENDING" | "PROCESSED" | "DENIED";

interface LostCancelledActionsProps {
  leadId: string;
  leadName: string;
  refundStatus: "NOT_APPLICABLE" | EditableRefund;
  refundEditable: boolean;
}

/**
 * Reopen + refund tracking for the Lost & cancelled list. Reopening a
 * cancelled record whose refund is already processed goes through an
 * explicit warning first (PRD money-safety gate).
 */
export function LostCancelledActions({
  leadId,
  leadName,
  refundStatus,
  refundEditable,
}: LostCancelledActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);

  async function reopen(confirmed: boolean) {
    setBusy(true);
    const result = await reopenLeadAction({ leadId, confirmedRefundWarning: confirmed });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.data.needsConfirmation) {
      setWarnOpen(true);
      return;
    }
    setWarnOpen(false);
    toast.success(`${leadName} reopened — back in the active pipeline.`);
    router.refresh();
  }

  async function updateRefund(value: string) {
    setBusy(true);
    const result = await setRefundStatusAction({
      leadId,
      refundStatus: value as EditableRefund,
    });
    setBusy(false);
    if (result.ok) {
      toast.success(`Refund marked ${value.toLowerCase()}.`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {refundEditable && refundStatus !== "NOT_APPLICABLE" && (
        <Select value={refundStatus} onValueChange={updateRefund} disabled={busy}>
          <SelectTrigger className="h-8 w-32 text-xs" aria-label="Refund status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Refund pending</SelectItem>
            <SelectItem value="PROCESSED">Refund processed</SelectItem>
            <SelectItem value="DENIED">Refund denied</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Button size="sm" variant="outline" onClick={() => reopen(false)} disabled={busy}>
        Reopen
      </Button>

      <ConfirmDialog
        open={warnOpen}
        onOpenChange={setWarnOpen}
        title="Refund already processed"
        description={`Money has already been sent back for ${leadName}'s booking. Reopening won't undo that refund automatically — you'll have to knowingly re-collect payment.`}
        confirmLabel="Reopen anyway"
        destructive
        loading={busy}
        onConfirm={() => reopen(true)}
      />
    </div>
  );
}
