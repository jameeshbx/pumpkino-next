import { z } from "zod";

export const itineraryDaySchema = z.object({
  title: z.string().trim().min(1, "Give this day a title").max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const upsertItinerarySchema = z.object({
  leadId: z.string().min(1),
  overview: z.string().trim().max(2000).optional().or(z.literal("")),
  hotelName: z.string().trim().max(150).optional().or(z.literal("")),
  hotelCategory: z.string().trim().max(60).optional().or(z.literal("")),
  days: z.array(itineraryDaySchema).max(30),
});
export type UpsertItineraryInput = z.infer<typeof upsertItinerarySchema>;
