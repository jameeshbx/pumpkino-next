"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeUserAction, suspendUserAction } from "@/features/team/actions";
import {
  UserFormDialog,
  type EditableUser,
  type RoleOption,
  type TeamLeadOption,
} from "@/features/team/components/user-form-dialog";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

interface UserRowActionsProps {
  user: EditableUser & { suspended: boolean };
  roleOptions: RoleOption[];
  teamLeads: TeamLeadOption[];
  /** Names of active users reporting to this user (Team Leads only). */
  reportNames: string[];
  /** Count of active leads assigned to this user. */
  assignedLeadCount: number;
  isSelf: boolean;
}

type PendingAction = "suspend" | "reactivate" | "remove" | null;

export function UserRowActions({
  user,
  roleOptions,
  teamLeads,
  reportNames,
  assignedLeadCount,
  isSelf,
}: UserRowActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(successMessage);
        setPendingAction(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  const reportsNote =
    reportNames.length > 0 ? (
      <p className="mt-2">
        <strong>{reportNames.join(", ")}</strong>{" "}
        {reportNames.length === 1 ? "reports" : "report"} to this user.
      </p>
    ) : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <UserFormDialog
            roleOptions={roleOptions}
            teamLeads={teamLeads}
            user={user}
            reportNames={reportNames}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            }
          />
          {!isSelf && (
            <>
              {user.suspended ? (
                <DropdownMenuItem onSelect={() => setPendingAction("reactivate")}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Reactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setPendingAction("suspend")}>
                  <ShieldOff className="mr-2 h-4 w-4" /> Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setPendingAction("remove")}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={pendingAction === "suspend"}
        onOpenChange={(o) => !o && setPendingAction(null)}
        title={`Suspend ${user.name}?`}
        description={
          <div>
            <p>
              They won&apos;t be able to sign in or be assigned new leads until reactivated.
              Suspension is reversible and keeps all their data and links intact.
            </p>
            {reportsNote}
          </div>
        }
        confirmLabel="Suspend"
        destructive
        loading={isPending}
        onConfirm={() =>
          run(
            () => suspendUserAction({ userId: user.userId, suspend: true }),
            `${user.name} suspended.`,
          )
        }
      />

      <ConfirmDialog
        open={pendingAction === "reactivate"}
        onOpenChange={(o) => !o && setPendingAction(null)}
        title={`Reactivate ${user.name}?`}
        description="They will regain access with the same role and links as before."
        confirmLabel="Reactivate"
        loading={isPending}
        onConfirm={() =>
          run(
            () => suspendUserAction({ userId: user.userId, suspend: false }),
            `${user.name} reactivated.`,
          )
        }
      />

      <ConfirmDialog
        open={pendingAction === "remove"}
        onOpenChange={(o) => !o && setPendingAction(null)}
        title={`Remove ${user.name}?`}
        description={
          <div>
            <p>This can&apos;t be undone. Their account is deactivated permanently.</p>
            {assignedLeadCount > 0 && (
              <p className="mt-2">
                <strong>{assignedLeadCount}</strong> assigned lead
                {assignedLeadCount === 1 ? "" : "s"} will become unassigned.
              </p>
            )}
            {reportsNote && (
              <div>
                {reportsNote}
                <p>They will become unassigned.</p>
              </div>
            )}
          </div>
        }
        confirmLabel="Remove user"
        destructive
        loading={isPending}
        onConfirm={() =>
          run(() => removeUserAction({ userId: user.userId }), `${user.name} removed.`)
        }
      />
    </>
  );
}
