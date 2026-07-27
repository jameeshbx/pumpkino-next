import { z } from "zod";

/**
 * Business verification submission (PRD: GSTIN / IATA / business registration
 * / free-text extra). At least one identifier is required — otherwise there
 * is nothing to review.
 */
export const verificationSchema = z
  .object({
    gstin: z
      .string()
      .trim()
      .max(20)
      .regex(/^[0-9A-Z]*$/i, "GSTIN can only contain letters and digits")
      .optional()
      .or(z.literal("")),
    iata: z
      .string()
      .trim()
      .max(20)
      .regex(/^[0-9A-Z-]*$/i, "IATA code can only contain letters, digits and dashes")
      .optional()
      .or(z.literal("")),
    bizReg: z.string().trim().max(60).optional().or(z.literal("")),
    extra: z.string().trim().max(500).optional().or(z.literal("")),
    fileAttached: z.boolean().default(false),
  })
  .refine((d) => Boolean(d.gstin || d.iata || d.bizReg || d.extra), {
    message: "Provide at least one identifier or document reference",
    path: ["gstin"],
  });

export type VerificationInput = z.infer<typeof verificationSchema>;
