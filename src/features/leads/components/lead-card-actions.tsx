"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Ban, Loader2, MoreHorizontal, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { LeadStage } from "@prisma/client";
import {
  AGENCY_LOST_REASONS,
  LEAD_CANCELLABLE_STAGES,
  LEAD_LOSABLE_STAGES,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
} from "@/domain/pipeline/lifecycle";
import { advanceLeadAction, cancelBookingAction, markLostAction } from "@/features/leads/actions";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";

interface LeadCardActionsProps {
  leadId: string;
  leadName: string;
  stage: LeadStage;
}

/**
 * Per-card pipeline actions: advance a stage, mark lost (pre-payment stages,
 * with a reason code), or cancel booking (payment stages, with refund
 * tracking) — mirroring the prototype's transitions.
 */
export function LeadCardActions({ leadId, leadName, stage }: LeadCardActionsProps) {
  const router = useRouter();
  const [lostOpen, setLostOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState(AGENCY_LOST_REASONS[0]!.value);
  const [initiatedBy, setInitiatedBy] = useState<"CUSTOMER" | "AGENCY">("CUSTOMER");
  const [busy, setBusy] = useState(false);

  const stageIndex = LEAD_STAGES.indexOf(stage);
  const nextStage = LEAD_STAGES[stageIndex + 1];
  const canLose = LEAD_LOSABLE_STAGES.includes(stage);
  const canCancel = LEAD_CANCELLABLE_STAGES.includes(stage);

  async function advance() {
    setBusy(true);
    const result = await advanceLeadAction(leadId);
    setBusy(false);
    if (result.ok) {
      toast.success(`${leadName} moved to “${nextStage ? LEAD_STAGE_LABELS[nextStage] : ""}”.`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function submitLost() {
    setBusy(true);
    const result = await markLostAction({ leadId, reason, initiatedBy });
    setBusy(false);
    if (result.ok) {
      toast.success(`${leadName} moved to Lost & cancelled.`);
      setLostOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function submitCancel() {
    setBusy(true);
    const result = await cancelBookingAction({ leadId, initiatedBy: "CUSTOMER" });
    setBusy(false);
    setCancelOpen(false);
    if (result.ok) {
      toast.success(
        `Booking cancelled — refund tracking is ${result.data.refundStatus.toLowerCase()}. Find it under Lost & cancelled.`,
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Actions for ${leadName}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {nextStage && (
            <DropdownMenuItem onSelect={advance} disabled={busy}>
              <ArrowRight /> Move to “{LEAD_STAGE_LABELS[nextStage]}”
            </DropdownMenuItem>
          )}
          {(canLose || canCancel) && <DropdownMenuSeparator />}
          {canLose && (
            <DropdownMenuItem onSelect={() => setLostOpen(true)} className="text-destructive">
              <XCircle /> Mark as lost…
            </DropdownMenuItem>
          )}
          {canCancel && (
            <DropdownMenuItem onSelect={() => setCancelOpen(true)} className="text-destructive">
              <Ban /> Cancel booking…
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mark lost dialog */}
      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark “{leadName}” as lost</DialogTitle>
            <DialogDescription>
              The lead leaves the active pipeline but stays in Lost &amp; cancelled — you can reopen
              it any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-sm font-medium">Reason</p>
              <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENCY_LOST_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Who initiated it?</p>
              <Select
                value={initiatedBy}
                onValueChange={(v) => setInitiatedBy(v as "CUSTOMER" | "AGENCY")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="AGENCY">Our agency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostOpen(false)} disabled={busy}>
              Keep active
            </Button>
            <Button variant="destructive" onClick={submitLost} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel booking confirm */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel ${leadName}'s booking?`}
        description={
          stage === "DONE"
            ? "This booking is fully paid. Cancelling sets refund tracking to pending and applies the tiered cancellation policy (100% / 50% / 0% by days before travel)."
            : "An advance has been logged for this booking. Cancelling sets refund tracking to pending and applies the tiered cancellation policy."
        }
        confirmLabel="Cancel booking"
        destructive
        loading={busy}
        onConfirm={submitCancel}
      />
    </>
  );
}
