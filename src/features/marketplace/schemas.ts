import { z } from "zod";

export const quoteRequestSchema = z.object({
  listingId: z.string().min(1),
  destination: z.string().trim().min(2, "Enter the destination").max(120),
  pax: z.string().trim().min(1, "Describe the travellers, e.g. Family of 4").max(60),
  nights: z.coerce.number().int().min(1, "At least 1 night").max(60),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a travel date"),
  budget: z.string().trim().max(60).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
