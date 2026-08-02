import { z } from "zod";

export const subscribeSchema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "SCALE"]),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]).default("MONTHLY"),
  gateway: z.enum(["RAZORPAY", "PAYPAL"]).optional(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
