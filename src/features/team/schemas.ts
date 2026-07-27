import { z } from "zod";
import { emailSchema } from "@/shared/validation/password";

const extras = {
  teamType: z.string().max(60).optional(),
  teamLeadId: z.string().cuid().optional().or(z.literal("")),
  destinations: z.string().max(300).optional(), // comma-separated in the form
};

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: emailSchema,
  roleKey: z.string().min(1, "Pick a role"),
  ...extras,
});

export const updateUserSchema = z.object({
  userId: z.string().cuid(),
  name: z.string().trim().min(2, "Name is required").max(120),
  roleKey: z.string().min(1, "Pick a role"),
  ...extras,
});

export const userIdSchema = z.object({ userId: z.string().cuid() });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export function parseDestinations(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .slice(0, 20);
}
