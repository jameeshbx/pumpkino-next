"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePackageAction } from "@/features/packages/actions";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";

export function PackageDeleteButton({
  packageId,
  title,
}: {
  packageId: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const result = await deletePackageAction({ packageId });
    setBusy(false);
    if (result.ok) {
      toast.success(`“${title}” deleted.`);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${title}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete “${title}”?`}
        description="Agencies will no longer see this package on your marketplace page."
        confirmLabel="Delete"
        destructive
        loading={busy}
        onConfirm={remove}
      />
    </>
  );
}
