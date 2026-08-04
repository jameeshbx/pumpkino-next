import { z } from "zod";

export const createLeadSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer's name").max(100),
  destination: z.string().trim().min(2, "Enter the destination").max(120),
  pax: z.string().trim().max(60).optional().or(z.literal("")),
  mobile: z
    .string()
    .trim()
    .max(20)
    .regex(/^$|^[+\d][\d\s\-()]+$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").max(254).optional().or(z.literal("")),
  startDate: z
    .string()
    .regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Pick a valid date")
    .optional()
    .or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const markLostSchema = z.object({
  leadId: z.string().min(1),
  reason: z.enum([
    "REJECTED_QUOTE",
    "NO_RESPONSE_AFTER_REVISION",
    "REJECTED_AFTER_PRICING",
    "NO_RESPONSE_EXPIRED",
  ]),
  initiatedBy: z.enum(["CUSTOMER", "AGENCY"]),
});
export type MarkLostInput = z.infer<typeof markLostSchema>;

export const cancelBookingSchema = z.object({
  leadId: z.string().min(1),
  initiatedBy: z.enum(["CUSTOMER", "AGENCY"]),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const reopenLeadSchema = z.object({
  leadId: z.string().min(1),
  confirmedRefundWarning: z.boolean().default(false),
});
export type ReopenLeadInput = z.infer<typeof reopenLeadSchema>;

const columnMappingSchema = z.object({
  name: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
  destination: z.string().optional(),
  pax: z.string().optional(),
  startDate: z.string().optional(),
  stage: z.string().optional(),
});

const leadStageEnum = z.enum(["NEW", "SENT", "CONFIRMED", "DMC", "MARKUP", "PAYMENT", "DONE"]);

export const previewImportSchema = z.object({
  headers: z.array(z.string()),
  rawRows: z.array(z.array(z.string())).max(2000, "Import up to 2,000 rows at a time"),
  mapping: columnMappingSchema,
  stageMapping: z.record(z.string(), leadStageEnum),
});
export type PreviewImportInput = z.infer<typeof previewImportSchema>;

const importPreviewRowSchema = z.object({
  name: z.string(),
  mobile: z.string().nullable(),
  email: z.string().nullable(),
  destination: z.string(),
  pax: z.string().nullable(),
  startDate: z.string().nullable(),
  stage: leadStageEnum,
  importedNotes: z.string().nullable(),
  isDuplicate: z.boolean(),
});

export const commitImportSchema = z.object({
  rows: z.array(importPreviewRowSchema).max(2000),
  includeDuplicates: z.boolean(),
});
export type CommitImportInput = z.infer<typeof commitImportSchema>;

export const undoImportSchema = z.object({ batchId: z.string().min(1) });
export type UndoImportInput = z.infer<typeof undoImportSchema>;

export const refundStatusSchema = z.object({
  leadId: z.string().min(1),
  refundStatus: z.enum(["PENDING", "PROCESSED", "DENIED"]),
});
export type RefundStatusInput = z.infer<typeof refundStatusSchema>;
