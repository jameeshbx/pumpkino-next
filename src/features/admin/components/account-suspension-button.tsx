"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setAccountSuspensionAction } from "@/features/admin/actions";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";

interface AccountSuspensionButtonProps {
  accountId: string;
  accountName: string;
  suspended: boolean;
}

export function AccountSuspensionButton({
  accountId,
  accountName,
  suspended,
}: AccountSuspensionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    const result = await setAccountSuspensionAction({ accountId, suspend: !suspended });
    setLoading(false);
    setOpen(false);
    if (result.ok) {
      toast.success(suspended ? `${accountName} reactivated.` : `${accountName} suspended.`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant={suspended ? "outline" : "destructive"}
        onClick={() => setOpen(true)}
      >
        {suspended ? "Reactivate" : "Suspend"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={suspended ? `Reactivate ${accountName}?` : `Suspend ${accountName}?`}
        description={
          suspended
            ? "All users on this account will be able to sign in again."
            : "All users on this account will be blocked from signing in until reactivated. Data is preserved."
        }
        confirmLabel={suspended ? "Reactivate" : "Suspend account"}
        destructive={!suspended}
        loading={loading}
        onConfirm={confirm}
      />
    </>
  );
}
