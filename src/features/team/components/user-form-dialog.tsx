"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createUserSchema, type CreateUserInput } from "@/features/team/schemas";
import { createUserAction, updateUserAction } from "@/features/team/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

const UNASSIGNED = "unassigned";

export interface RoleOption {
  key: string;
  name: string;
  extraField: "teamType" | "teamLead" | "destinations" | null;
}

export interface TeamLeadOption {
  id: string;
  name: string;
}

export interface EditableUser {
  userId: string;
  name: string;
  email: string;
  roleKey: string;
  teamType: string;
  teamLeadId: string;
  destinations: string; // comma-separated
}

interface UserFormDialogProps {
  roleOptions: RoleOption[];
  teamLeads: TeamLeadOption[];
  /** When set, the dialog edits this user instead of creating one. */
  user?: EditableUser;
  trigger: ReactNode;
  /**
   * Set when editing a Team Lead who has reports — used to warn that a role
   * change will unassign them (PRD cascade rule).
   */
  reportNames?: string[];
}

export function UserFormDialog({
  roleOptions,
  teamLeads,
  user,
  trigger,
  reportNames = [],
}: UserFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const isEdit = Boolean(user);

  // Edit mode reuses the create schema: the (hidden) email field keeps the
  // user's current — valid — address, and the server ignores it on update.
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      roleKey: user?.roleKey ?? "",
      teamType: user?.teamType ?? "",
      teamLeadId: user?.teamLeadId ?? "",
      destinations: user?.destinations ?? "",
    },
  });

  const selectedRole = form.watch("roleKey");
  const extraField = roleOptions.find((r) => r.key === selectedRole)?.extraField ?? null;
  const leavingTeamLead =
    isEdit && user?.roleKey === "AGENCY_TEAM_LEAD" && selectedRole !== "AGENCY_TEAM_LEAD";

  async function onSubmit(values: CreateUserInput) {
    const payload = {
      ...values,
      teamLeadId: values.teamLeadId === UNASSIGNED ? "" : values.teamLeadId,
    };

    if (isEdit && user) {
      const result = await updateUserAction({ ...payload, userId: user.userId });
      if (result.ok) {
        toast.success(
          result.data.clearedReports > 0
            ? `Saved. ${result.data.clearedReports} team member(s) are now unassigned.`
            : "User updated.",
        );
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
      return;
    }

    const result = await createUserAction(payload);
    if (result.ok) {
      toast.success(`User “${values.name}” added.`);
      setTempPassword(result.data.temporaryPassword);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTempPassword(null);
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {tempPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>User created</DialogTitle>
              <DialogDescription>
                Share this temporary password securely. It is shown only once — the user should
                change it after their first login.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
              <code className="flex-1 break-all text-sm">{tempPassword}</code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(tempPassword);
                  toast.success("Copied to clipboard.");
                }}
              >
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{isEdit ? `Edit ${user?.name}` : "Add user"}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Change details or role. Role changes update what this user can see."
                  : "New users receive a temporary password to sign in with."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Anita Prem" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isEdit && (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="name@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="roleKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pick a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roleOptions.map((r) => (
                            <SelectItem key={r.key} value={r.key}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {leavingTeamLead && reportNames.length > 0 && (
                        <FormDescription className="text-destructive">
                          {reportNames.join(", ")} currently report to this Team Lead and will
                          become unassigned.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {extraField === "teamType" && (
                  <FormField
                    control={form.control}
                    name="teamType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Domestic, International" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {extraField === "teamLead" && (
                  <FormField
                    control={form.control}
                    name="teamLeadId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reports to</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || UNASSIGNED}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                            {teamLeads.map((tl) => (
                              <SelectItem key={tl.id} value={tl.id}>
                                {tl.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Only active Team Leads can be picked. Leave unassigned if none fits.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {extraField === "destinations" && (
                  <FormField
                    control={form.control}
                    name="destinations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned destinations</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Munnar, Bali, Dubai" {...field} />
                        </FormControl>
                        <FormDescription>Comma-separated list.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEdit ? "Save changes" : "Create user"}
                </Button>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
