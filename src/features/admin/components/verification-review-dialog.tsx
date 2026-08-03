"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reviewVerificationAction } from "@/features/admin/actions";
import { Button } from "@/shared/components/ui/button";
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
import { DocumentList, type VerificationDocumentView } from "@/features/admin/components/document-list";
import { LogDocumentForm } from "@/features/admin/components/log-document-form";

interface VerificationReviewDialogProps {
  submissionId: string;
  accountId: string;
  accountName: string;
  details: { label: string; value: string }[];
  documents: VerificationDocumentView[];
}

export function VerificationReviewDialog({
  submissionId,
  accountId,
  accountName,
  details,
  documents,
}: VerificationReviewDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED" | "MORE_INFO") {
    setPending(decision);
    const result = await reviewVerificationAction({ submissionId, decision, note });
    setPending(null);
    if (result.ok) {
      toast.success(
        decision === "APPROVED"
          ? `${accountName} approved.`
          : decision === "REJECTED"
            ? `${accountName} rejected.`
            : `More info requested from ${accountName}.`,
      );
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Review</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verification — {accountName}</DialogTitle>
          <DialogDescription>
            Check the submitted identifiers, then approve, reject, or ask for more information.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm">
          {details.map((d) => (
            <div key={d.label}>
              <dt className="text-xs text-muted-foreground">{d.label}</dt>
              <dd className="font-medium">{d.value || "—"}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Documents
          </p>
          <DocumentList documents={documents} />
        </div>
        <LogDocumentForm accountId={accountId} />

        <div>
          <label htmlFor="review-note" className="mb-1.5 block text-sm font-medium">
            Reviewer note{" "}
            <span className="font-normal text-muted-foreground">(required for “more info”)</span>
          </label>
          <Textarea
            id="review-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Visible to the business, e.g. GSTIN doesn't match the company name"
          />
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            disabled={pending !== null}
            onClick={() => decide("MORE_INFO")}
          >
            {pending === "MORE_INFO" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Request more info
          </Button>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={pending !== null}
              onClick={() => decide("REJECTED")}
            >
              {pending === "REJECTED" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
            <Button disabled={pending !== null} onClick={() => decide("APPROVED")}>
              {pending === "APPROVED" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
