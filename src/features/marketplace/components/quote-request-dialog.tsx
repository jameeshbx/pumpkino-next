"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { quoteRequestSchema, type QuoteRequestInput } from "@/features/marketplace/schemas";
import { sendQuoteRequestAction } from "@/features/marketplace/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

interface QuoteRequestDialogProps {
  listingId: string;
  dmcName: string;
  defaultDestination: string;
}

/**
 * Async quote request (PRD: no instant simulated reply — the DMC responds on
 * their own schedule and the request shows as awaiting in both dashboards).
 */
export function QuoteRequestDialog({ listingId, dmcName, defaultDestination }: QuoteRequestDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<QuoteRequestInput>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      listingId,
      destination: defaultDestination,
      pax: "",
      nights: 3,
      startDate: "",
      budget: "",
      message: "",
    },
  });

  async function onSubmit(values: QuoteRequestInput) {
    const result = await sendQuoteRequestAction(values);
    if (result.ok) {
      toast.success(`Quote request sent to ${dmcName}. They'll reply on their own schedule — track it under Quote requests.`);
      setOpen(false);
      form.reset();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send className="mr-1 h-4 w-4" /> Send quote request
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a quote from {dmcName}</DialogTitle>
          <DialogDescription>
            The DMC replies on their own schedule — usually within their listed response time.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Munnar, Alleppey" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="pax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Travellers</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Family of 4" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nights</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={60} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Travel date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. ₹15,000/head" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes for the DMC (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Anything specific — hotel category, must-see spots…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send request
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
