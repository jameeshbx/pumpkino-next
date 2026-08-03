"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { DocumentList, type VerificationDocumentView } from "@/features/admin/components/document-list";
import { LogDocumentForm } from "@/features/admin/components/log-document-form";

interface LogDocumentDialogProps {
  accountId: string;
  accountName: string;
  documents: VerificationDocumentView[];
}

/**
 * For accounts that haven't self-submitted yet — Ops can still log a
 * document received outside the app. Doing so moves the account into the
 * actionable verification queue (see logVerificationDocumentAction).
 */
export function LogDocumentDialog({ accountId, accountName, documents }: LogDocumentDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          {documents.length > 0 ? `Docs (${documents.length})` : "Log document"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{accountName}</DialogTitle>
          <DialogDescription>
            Not yet submitted — this account is active and using its trial/free plan normally.
          </DialogDescription>
        </DialogHeader>
        <DocumentList documents={documents} />
        <LogDocumentForm accountId={accountId} onLogged={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
