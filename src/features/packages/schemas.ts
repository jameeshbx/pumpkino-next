import { z } from "zod";

export const listingProfileSchema = z.object({
  destinations: z.string().max(400), // comma-separated in the form
  services: z.string().max(400),
  description: z.string().max(1000),
});

export const packageSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(120),
  dest: z.string().trim().min(2, "Destination is required").max(80),
  duration: z.string().trim().min(1, "e.g. 4N / 5D").max(40),
  price: z.coerce.number().int().positive("Enter a price").max(100_000_000),
  unit: z.string().trim().min(1, "e.g. per person").max(40),
  highlights: z.string().max(400), // comma-separated in the form
});

export const packageIdSchema = z.object({ packageId: z.string().cuid() });

export type ListingProfileInput = z.infer<typeof listingProfileSchema>;
export type PackageFormInput = z.infer<typeof packageSchema>;

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}
