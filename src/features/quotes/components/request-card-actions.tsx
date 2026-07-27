"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { RequestStage } from "@prisma/client";
import { DMC_LOST_REASONS } from "@/domain/pipeline/lifecycle";
import {
  awaitPaymentAction,
  cancelRequestAction,
  confirmBookingAction,
  markRequestLostAction,
  sendQuoteAction,
  startReviewAction,
} from "@/features/quotes/actions";
import { sendQuoteSchema, type SendQuoteInput } from "@/features/quotes/schemas";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";

interface RequestCardActionsProps {
  requestId: string;
  agencyName: string;
  stage: RequestStage;
}

/**
 * Per-stage actions for the DMC request inbox. Quote IDs and booking IDs are
 * generated server-side at the exact transitions the PRD defines.
 */
export function RequestCardActions({ requestId, agencyName, stage }: RequestCardActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [lostReason, setLostReason] = useState(DMC_LOST_REASONS[0]!.value);

  const quoteForm = useForm<SendQuoteInput>({
    resolver: zodResolver(sendQuoteSchema),
    defaultValues: { requestId, quotedPrice: 0 },
  });

  async function run(
    fn: () => Promise<{ ok: true; data?: unknown } | { ok: false; error: string }>,
    successMessage: (data: never) => string,
  ) {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (result.ok) {
      toast.success(successMessage(("data" in result ? result.data : undefined) as never));
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onSendQuote(values: SendQuoteInput) {
    const result = await sendQuoteAction(values);
    if (result.ok) {
      toast.success(`Quote ${result.data.quoteId} sent to ${agencyName}.`);
      setQuoteOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const canMarkLost = stage === "NEW" || stage === "REVIEW" || stage === "SENT";
  const canCancel = stage === "PAYMENT" || stage === "DONE";

  return (
    <>
      <div className="flex items-center gap-1">
        {stage === "NEW" && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                () => startReviewAction({ requestId }),
                () => "Moved to review.",
              )
            }
          >
            Start review
          </Button>
        )}
        {(stage === "NEW" || stage === "REVIEW") && (
          <Button size="sm" disabled={busy} onClick={() => setQuoteOpen(true)}>
            Send quote
          </Button>
        )}
        {stage === "SENT" && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              run(
                () => awaitPaymentAction({ requestId }),
                () => "Marked as awaiting payment.",
              )
            }
          >
            Agency accepted
          </Button>
        )}
        {stage === "PAYMENT" && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              run(
                () => confirmBookingAction({ requestId }),
                (data: { bookingId: string }) => `Booked! Booking ID ${data.bookingId}.`,
              )
            }
          >
            Payment received
          </Button>
        )}

        {(canMarkLost || canCancel) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`More actions for ${agencyName}'s request`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Outcome</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {canMarkLost && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setLostOpen(true)}
                >
                  Mark as lost…
                </DropdownMenuItem>
              )}
              {canCancel && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setCancelOpen(true)}
                >
                  Cancel booking…
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Send quote — price required; PMK-Q ID generated on the server. */}
      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send quote to {agencyName}</DialogTitle>
            <DialogDescription>
              A quote ID (PMK-Q-…) is generated the moment this is sent.
            </DialogDescription>
          </DialogHeader>
          <Form {...quoteForm}>
            <form onSubmit={quoteForm.handleSubmit(onSendQuote)} className="space-y-4" noValidate>
              <FormField
                control={quoteForm.control}
                name="quotedPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quoted amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} placeholder="e.g. 58000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={quoteForm.formState.isSubmitting}
              >
                {quoteForm.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send quote
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Mark lost — reason required, pre-payment stages only. */}
      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark request as lost</DialogTitle>
            <DialogDescription>
              The request moves to Lost &amp; cancelled and can be reopened later.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={lostReason}
            onValueChange={(v) => setLostReason(v as typeof lostReason)}
          >
            <SelectTrigger aria-label="Loss reason">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DMC_LOST_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  markRequestLostAction({
                    requestId,
                    reason: lostReason,
                    initiatedBy: "AGENCY",
                  }),
                () => "Marked as lost.",
              ).then(() => setLostOpen(false))
            }
          >
            Mark lost
          </Button>
        </DialogContent>
      </Dialog>

      {/* Cancel booking — money involved; refund tracking starts automatically. */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this booking?"
        description="Payment has been made on this booking. Cancelling moves it to Lost & cancelled and starts refund tracking automatically."
        confirmLabel="Cancel booking"
        destructive
        loading={busy}
        onConfirm={() =>
          run(
            () => cancelRequestAction({ requestId, initiatedBy: "AGENCY" }),
            () => "Booking cancelled — refund tracking started.",
          ).then(() => setCancelOpen(false))
        }
      />
    </>
  );
}
