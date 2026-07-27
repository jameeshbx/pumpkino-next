import { z } from "zod";

export const taxSettingsSchema = z.object({
  schemeKey: z.string().min(1, "Pick a tax scheme").max(60),
  rate: z.coerce
    .number({ message: "Enter the tax rate" })
    .min(0, "Rate can't be negative")
    .max(100, "Rate can't exceed 100%"),
  appliesTo: z.enum(["TOTAL", "MARGIN"], { message: "Choose what the tax applies to" }),
});

export type TaxSettingsInput = z.infer<typeof taxSettingsSchema>;
