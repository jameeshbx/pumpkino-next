import { z } from "zod";

/**
 * Strong password policy (OWASP ASVS-aligned): length is the primary control;
 * complexity classes catch trivially weak choices. Shared by client and
 * server validation.
 */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((v) => /[a-z]/.test(v), "Include at least one lowercase letter")
  .refine((v) => /[A-Z]/.test(v), "Include at least one uppercase letter")
  .refine((v) => /[0-9]/.test(v), "Include at least one number");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254);
