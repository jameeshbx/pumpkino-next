"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateDisputeAction } from "@/features/admin/actions";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

interface DisputePanelProps {
  disputeId: string;
  status: "OPEN" | "RESOLVED";
}

export function DisputePanel({ disputeId, status }: DisputePanelProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"note" | "status" | null>(null);

  async function addNote() {
    if (!note.trim()) {
      toast.error("Write a note first.");
      return;
    }
    setPending("note");
    const result = await updateDisputeAction({ disputeId, note });
    setPending(null);
    if (result.ok) {
      toast.success("Note added.");
      setNote("");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function toggleStatus() {
    setPending("status");
    const result = await updateDisputeAction({
      disputeId,
      status: status === "OPEN" ? "RESOLVED" : "OPEN",
    });
    setPending(null);
    if (result.ok) {
      toast.success(status === "OPEN" ? "Dispute resolved." : "Dispute reopened.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a mediation note…"
        aria-label="Dispute note"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={addNote} disabled={pending !== null}>
          {pending === "note" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add note
        </Button>
        <Button
          size="sm"
          variant={status === "OPEN" ? "default" : "ghost"}
          onClick={toggleStatus}
          disabled={pending !== null}
        >
          {pending === "status" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {status === "OPEN" ? "Mark resolved" : "Reopen"}
        </Button>
      </div>
    </div>
  );
}
