"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listingProfileSchema, type ListingProfileInput } from "@/features/packages/schemas";
import { updateListingProfileAction } from "@/features/packages/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

interface ListingProfileFormProps {
  defaults: ListingProfileInput;
}

export function ListingProfileForm({ defaults }: ListingProfileFormProps) {
  const router = useRouter();
  const form = useForm<ListingProfileInput>({
    resolver: zodResolver(listingProfileSchema),
    defaultValues: defaults,
  });

  async function onSubmit(values: ListingProfileInput) {
    const result = await updateListingProfileAction(values);
    if (result.ok) {
      toast.success("Listing profile saved.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="destinations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destinations you cover</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Bali, Lombok, Java" {...field} />
              </FormControl>
              <FormDescription>Comma-separated. Shown on your marketplace card.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="services"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Services</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Hotels, Transfers, Guides, Activities" {...field} />
              </FormControl>
              <FormDescription>Comma-separated.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>About your company</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="What agencies should know about working with you…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save listing
        </Button>
      </form>
    </Form>
  );
}
