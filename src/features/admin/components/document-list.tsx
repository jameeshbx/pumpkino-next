import type { DocumentUploader } from "@prisma/client";
import { FileText } from "lucide-react";
import { formatDate } from "@/shared/lib/utils";

export interface VerificationDocumentView {
  id: string;
  name: string;
  uploadedBy: DocumentUploader;
  note: string | null;
  createdAt: Date;
}

const UPLOADER_LABEL: Record<DocumentUploader, string> = {
  AGENCY: "Uploaded by agency",
  DMC: "Uploaded by DMC",
  OPS: "Logged by Ops",
};

/** Document provenance list (prototype pumpkino-admin.html's "Documents" panel). */
export function DocumentList({ documents }: { documents: VerificationDocumentView[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents attached yet.</p>;
  }
  return (
    <ul className="divide-y rounded-lg border">
      {documents.map((d) => (
        <li key={d.id} className="flex items-start gap-2.5 p-3 text-sm">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{d.name}</p>
            <p className="text-xs text-muted-foreground">
              {UPLOADER_LABEL[d.uploadedBy]} · {formatDate(d.createdAt)}
              {d.note ? ` · ${d.note}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
