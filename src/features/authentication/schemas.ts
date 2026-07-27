import { z } from "zod";
import { emailSchema, passwordSchema } from "@/shared/validation/password";
import { COUNTRIES } from "@/shared/constants/countries";

/** Shared client + server validation schemas for the authentication feature. */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    role: z.enum(["agency", "dmc"]),
    contactName: z.string().trim().min(2, "Enter your full name").max(100),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .min(7, "Enter a valid phone number")
      .max(20)
      .regex(/^[+\d][\d\s\-()]+$/, "Enter a valid phone number"),
    password: passwordSchema,
    passwordConfirm: z.string(),
    companyName: z.string().trim().min(2, "Enter your company name").max(120),
    city: z.string().trim().min(1, "Enter your city").max(80),
    state: z.string().trim().max(80).optional().or(z.literal("")),
    country: z.enum(COUNTRIES, { message: "Select your country" }),
    terms: z.literal(true, { message: "You must accept the terms to continue" }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
