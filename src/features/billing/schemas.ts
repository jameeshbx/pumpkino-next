import { z } from "zod";

export const subscribeSchema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "SCALE"]),
  gateway: z.enum(["RAZORPAY", "PAYPAL"]).optional(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
