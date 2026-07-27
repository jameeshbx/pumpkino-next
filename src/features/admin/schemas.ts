import { z } from "zod";

export const reviewVerificationSchema = z.object({
  submissionId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED", "MORE_INFO"]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type ReviewVerificationInput = z.infer<typeof reviewVerificationSchema>;

export const accountSuspensionSchema = z.object({
  accountId: z.string().min(1),
  suspend: z.boolean(),
});
export type AccountSuspensionInput = z.infer<typeof accountSuspensionSchema>;

export const disputeUpdateSchema = z.object({
  disputeId: z.string().min(1),
  status: z.enum(["OPEN", "RESOLVED"]).optional(),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type DisputeUpdateInput = z.infer<typeof disputeUpdateSchema>;

export const listingStatusSchema = z.object({
  listingId: z.string().min(1),
  status: z.enum(["PUBLISHED", "DRAFT"]),
});
export type ListingStatusInput = z.infer<typeof listingStatusSchema>;
