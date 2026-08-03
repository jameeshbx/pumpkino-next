"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logVerificationDocumentAction } from "@/features/admin/actions";
import { OPS_DOCUMENT_TYPES } from "@/features/admin/schemas";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/**
 * "Log a document received separately" — for docs that arrived by email,
 * courier, etc. instead of through the account's own Profile page
 * (prototype pumpkino-admin.html's addOpsDocument()).
 */
export function LogDocumentForm({
  accountId,
  onLogged,
}: {
  accountId: string;
  onLogged?: () => void;
}) {
  const router = useRouter();
  const [documentType, setDocumentType] = useState<string>(OPS_DOCUMENT_TYPES[0].key);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const result = await logVerificationDocumentAction({
      accountId,
      documentType: documentType as (typeof OPS_DOCUMENT_TYPES)[number]["key"],
      note,
    });
    setSubmitting(false);
    if (result.ok) {
      toast.success("Document logged.");
      setNote("");
      router.refresh();
      onLogged?.();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <div>
        <p className="text-sm font-medium">Log a document received separately</p>
        <p className="text-xs text-muted-foreground">
          If this account emailed, couriered, or otherwise sent a document outside the app, add it
          here so it&apos;s on file.
        </p>
      </div>
      <Select value={documentType} onValueChange={setDocumentType}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPS_DOCUMENT_TYPES.map((t) => (
            <SelectItem key={t.key} value={t.key}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="How was it received? (optional) e.g. Emailed by contact on 22 Jul"
      />
      <Button size="sm" className="w-full" onClick={submit} disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        + Add document
      </Button>
    </div>
  );
}
