import { z } from "zod";

export const reviewVerificationSchema = z.object({
  submissionId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED", "MORE_INFO"]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type ReviewVerificationInput = z.infer<typeof reviewVerificationSchema>;

export const OPS_DOCUMENT_TYPES = [
  { key: "gst", label: "GST certificate" },
  { key: "iata", label: "IATA certificate" },
  { key: "bizreg", label: "Business registration" },
  { key: "bank", label: "Bank account proof" },
  { key: "other", label: "Other document" },
] as const;

export const logVerificationDocumentSchema = z.object({
  accountId: z.string().min(1),
  documentType: z.enum(["gst", "iata", "bizreg", "bank", "other"]),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});
export type LogVerificationDocumentInput = z.infer<typeof logVerificationDocumentSchema>;

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
