import { z } from "zod";
import { emailSchema } from "@/shared/validation/password";

export const SUPPORT_TOPICS = [
  "Getting started",
  "Billing & subscriptions",
  "DMC marketplace",
  "Account & security",
  "Something else",
] as const;

export const supportContactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: emailSchema,
  topic: z.enum(SUPPORT_TOPICS, { message: "Select a topic" }),
  message: z.string().trim().min(10, "Tell us a bit more (at least 10 characters)").max(4000),
});
export type SupportContactInput = z.infer<typeof supportContactSchema>;
