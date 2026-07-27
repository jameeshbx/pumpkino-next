"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/application/auth/session";
import {
  createAccountUser,
  removeAccountUser,
  setUserSuspension,
  updateAccountUser,
} from "@/application/users/user-service";
import { toActionResult, type ActionResult } from "@/shared/lib/action-result";
import {
  createUserSchema,
  parseDestinations,
  updateUserSchema,
  userIdSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "./schemas";

const TEAM_PATHS = ["/dashboard/users", "/dashboard/leads"];

function revalidateTeam(): void {
  for (const p of TEAM_PATHS) revalidatePath(p);
}

export async function createUserAction(
  input: CreateUserInput,
): Promise<ActionResult<{ temporaryPassword: string }>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("users:manage");
    const data = createUserSchema.parse(input);
    const result = await createAccountUser(ctx, {
      name: data.name,
      email: data.email,
      roleKey: data.roleKey,
      teamType: data.teamType,
      teamLeadId: data.teamLeadId || undefined,
      assignedDestinations: parseDestinations(data.destinations),
    });
    revalidateTeam();
    return { temporaryPassword: result.temporaryPassword };
  });
}

export async function updateUserAction(
  input: UpdateUserInput,
): Promise<ActionResult<{ clearedReports: number }>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("users:manage");
    const data = updateUserSchema.parse(input);
    const result = await updateAccountUser(ctx, {
      userId: data.userId,
      name: data.name,
      roleKey: data.roleKey,
      teamType: data.teamType,
      teamLeadId: data.teamLeadId || undefined,
      assignedDestinations: parseDestinations(data.destinations),
    });
    revalidateTeam();
    return result;
  });
}

export async function suspendUserAction(input: {
  userId: string;
  suspend: boolean;
}): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("users:manage");
    const { userId } = userIdSchema.parse({ userId: input.userId });
    await setUserSuspension(ctx, { userId, suspend: input.suspend });
    revalidateTeam();
  });
}

export async function removeUserAction(input: { userId: string }): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const ctx = await requirePermission("users:manage");
    const { userId } = userIdSchema.parse(input);
    await removeAccountUser(ctx, { userId });
    revalidateTeam();
  });
}
