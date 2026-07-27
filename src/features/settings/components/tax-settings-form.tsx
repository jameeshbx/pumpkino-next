"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { taxSettingsSchema, type TaxSettingsInput } from "@/features/settings/schemas";
import { updateTaxSettingsAction } from "@/features/settings/actions";
import { CUSTOM_TAX_SCHEME_KEY, TAX_DISCLAIMER, type TaxDefault } from "@/domain/billing/tax";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

interface TaxSettingsFormProps {
  defaults: TaxDefault[]; // country-appropriate options (may be empty)
  current: TaxSettingsInput | null;
}

/**
 * Tax settings (PRD Section 3): pre-fills a country-appropriate default,
 * always editable, never enforced as the only option.
 */
export function TaxSettingsForm({ defaults, current }: TaxSettingsFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<TaxSettingsInput>({
    resolver: zodResolver(taxSettingsSchema),
    defaultValues: current ?? {
      schemeKey: defaults[0]?.schemeKey ?? CUSTOM_TAX_SCHEME_KEY,
      rate: defaults[0]?.rate ?? 0,
      appliesTo: defaults[0]?.appliesTo ?? "TOTAL",
    },
  });

  const schemeKey = form.watch("schemeKey");
  const isCustom = schemeKey === CUSTOM_TAX_SCHEME_KEY || !defaults.some((d) => d.schemeKey === schemeKey);

  function onSchemeChange(key: string) {
    form.setValue("schemeKey", key);
    const preset = defaults.find((d) => d.schemeKey === key);
    if (preset) {
      form.setValue("rate", preset.rate);
      form.setValue("appliesTo", preset.appliesTo);
    }
  }

  async function onSubmit(values: TaxSettingsInput) {
    setServerError(null);
    const result = await updateTaxSettingsAction(values);
    if (result.ok) {
      toast.success("Tax settings saved.");
      router.refresh();
    } else {
      setServerError(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="schemeKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax scheme</FormLabel>
              <Select onValueChange={onSchemeChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a scheme" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {defaults.map((d) => (
                    <SelectItem key={d.schemeKey} value={d.schemeKey}>
                      {d.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_TAX_SCHEME_KEY}>Custom rate (set your own)</SelectItem>
                </SelectContent>
              </Select>
              {defaults.find((d) => d.schemeKey === field.value)?.note && (
                <FormDescription>
                  {defaults.find((d) => d.schemeKey === field.value)?.note}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    disabled={!isCustom}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="appliesTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Applies to</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!isCustom}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="TOTAL">Total package price</SelectItem>
                    <SelectItem value="MARGIN">Margin only (sale − supplier cost)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{TAX_DISCLAIMER}</p>

        {serverError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save tax settings
        </Button>
      </form>
    </Form>
  );
}
