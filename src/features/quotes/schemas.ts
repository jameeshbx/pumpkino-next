import { z } from "zod";

export const requestIdSchema = z.object({ requestId: z.string().cuid() });

export const sendQuoteSchema = z.object({
  requestId: z.string().cuid(),
  quotedPrice: z.coerce
    .number()
    .int("Whole amount only")
    .positive("Enter the quoted amount")
    .max(100_000_000, "That looks too large"),
});

export const markRequestLostSchema = z.object({
  requestId: z.string().cuid(),
  reason: z.enum(["AGENCY_DECLINED", "AGENCY_BOOKED_ELSEWHERE", "NO_RESPONSE_EXPIRED"]),
  initiatedBy: z.enum(["CUSTOMER", "AGENCY", "DMC"]),
});

export const cancelRequestSchema = z.object({
  requestId: z.string().cuid(),
  initiatedBy: z.enum(["CUSTOMER", "AGENCY", "DMC"]),
});

export const reopenRequestSchema = z.object({
  requestId: z.string().cuid(),
  confirmedRefundWarning: z.boolean(),
});

export const requestRefundStatusSchema = z.object({
  requestId: z.string().cuid(),
  refundStatus: z.enum(["PENDING", "PROCESSED", "DENIED"]),
});

export type SendQuoteInput = z.infer<typeof sendQuoteSchema>;
export type MarkRequestLostInput = z.infer<typeof markRequestLostSchema>;
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;
