"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { verificationSchema, type VerificationInput } from "@/features/verification/schemas";
import { submitVerificationAction } from "@/features/verification/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

export function VerificationForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<VerificationInput>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { gstin: "", iata: "", bizReg: "", extra: "", fileAttached: false },
  });

  async function onSubmit(values: VerificationInput) {
    setServerError(null);
    const result = await submitVerificationAction(values);
    if (result.ok) {
      toast.success("Verification submitted — our ops team will review it shortly.");
      router.refresh();
    } else {
      setServerError(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="gstin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GSTIN</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 32ABCDE1234F1Z5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="iata"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IATA code</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="bizReg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business registration number</FormLabel>
              <FormControl>
                <Input placeholder="Company / trade licence number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="extra"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anything else for the reviewer</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Optional context, e.g. licence category" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fileAttached"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                    aria-label="Documents shared separately"
                  />
                </FormControl>
                <div>
                  <FormLabel className="text-sm font-normal">
                    I&apos;ve shared supporting documents with the ops team separately
                  </FormLabel>
                  <FormDescription>
                    Direct file upload is coming soon — until then the team accepts documents over
                    email.
                  </FormDescription>
                </div>
              </div>
            </FormItem>
          )}
        />
        {serverError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {serverError}
          </p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit for verification
        </Button>
      </form>
    </Form>
  );
}
