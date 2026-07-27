"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reopenRequestAction, requestRefundStatusAction } from "@/features/quotes/actions";
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

interface RequestLostActionsProps {
  requestId: string;
  agencyName: string;
  refundStatus: "NOT_APPLICABLE" | EditableRefund;
  refundEditable: boolean;
}

/** Reopen + refund tracking for the DMC Lost & cancelled list. */
export function RequestLostActions({
  requestId,
  agencyName,
  refundStatus,
  refundEditable,
}: RequestLostActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);

  async function reopen(confirmed: boolean) {
    setBusy(true);
    const result = await reopenRequestAction({ requestId, confirmedRefundWarning: confirmed });
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
    toast.success(`Request from ${agencyName} reopened.`);
    router.refresh();
  }

  async function updateRefund(value: string) {
    setBusy(true);
    const result = await requestRefundStatusAction({
      requestId,
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
        description={`Money has already been refunded for ${agencyName}'s booking. Reopening won't undo that refund automatically.`}
        confirmLabel="Reopen anyway"
        destructive
        loading={busy}
        onConfirm={() => reopen(true)}
      />
    </div>
  );
}
