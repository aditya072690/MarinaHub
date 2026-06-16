"use client";

import { updateMarinaSettings } from "@/actions/marina-settings";
import {
  DashCard,
  DashCardContent,
  DashCardHeader,
  DashCardTitle,
} from "@/components/dashboard/dash-card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createZodResolver } from "@/lib/forms/zod-resolver";
import { marinaSettingsSchema } from "@/lib/validations/marina-settings.schema";
import type { MarinaSettings } from "@/types/database";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type FormValues = z.infer<typeof marinaSettingsSchema>;

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export function MarinaSettingsForm({
  marinaId,
  settings,
}: {
  marinaId: string;
  settings: MarinaSettings;
}) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: createZodResolver(marinaSettingsSchema),
    defaultValues: {
      business_hours: settings.business_hours,
      booking_buffer_minutes: settings.booking_buffer_minutes,
      cancellation_policy: settings.cancellation_policy,
      tax_rate: Number(settings.tax_rate),
      deposit_pct: Number(settings.deposit_pct),
      currency: settings.currency,
      segmentation: settings.segmentation ?? {
        vip_min_bookings: 5,
        vip_min_spend: 2500,
      },
    },
  });

  useEffect(() => {
    form.reset({
      business_hours: settings.business_hours,
      booking_buffer_minutes: settings.booking_buffer_minutes,
      cancellation_policy: settings.cancellation_policy,
      tax_rate: Number(settings.tax_rate),
      deposit_pct: Number(settings.deposit_pct),
      currency: settings.currency,
      segmentation: settings.segmentation ?? {
        vip_min_bookings: 5,
        vip_min_spend: 2500,
      },
    });
  }, [form, settings]);

  async function onSubmit(values: FormValues) {
    const result = await updateMarinaSettings(marinaId, values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="dash-settings-form-stack">
        <DashCard hover={false} className="dash-settings-card" data-dash-animate>
          <DashCardHeader>
            <DashCardTitle className="dash-card-title-lg">Business Hours</DashCardTitle>
            <p className="dash-card-meta">
              Set operating hours for each day of the week.
            </p>
          </DashCardHeader>
          <DashCardContent className="dash-settings-card-body">
            <div className="dash-hours-grid" role="table" aria-label="Weekly business hours">
              <div className="dash-hours-row dash-hours-row--head" role="row">
                <span role="columnheader">Day</span>
                <span role="columnheader">Open</span>
                <span role="columnheader">Close</span>
                <span role="columnheader">Closed</span>
              </div>
            {DAYS.map((day) => (
              <div key={day} className="dash-hours-row" role="row">
                <span className="dash-hours-day" role="rowheader">{DAY_LABELS[day]}</span>
                <FormField
                  control={form.control}
                  name={`business_hours.${day}.open`}
                  render={({ field }) => (
                    <FormItem className="dash-hours-field">
                      <FormLabel className="sr-only">Open</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="dash-input" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`business_hours.${day}.close`}
                  render={({ field }) => (
                    <FormItem className="dash-hours-field">
                      <FormLabel className="sr-only">Close</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="dash-input" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`business_hours.${day}.closed`}
                  render={({ field }) => (
                    <FormItem className="dash-hours-field dash-hours-field--check">
                      <FormControl>
                        <label className="dash-hours-check">
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                          <span className="dash-hours-check-label">Closed</span>
                        </label>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            ))}
            </div>
          </DashCardContent>
        </DashCard>

        <DashCard hover={false} className="dash-settings-card" data-dash-animate>
          <DashCardHeader>
            <DashCardTitle className="dash-card-title-lg">Booking & Policies</DashCardTitle>
            <p className="dash-card-meta">
              Buffer times, cancellation windows, and refund rules.
            </p>
          </DashCardHeader>
          <DashCardContent className="dash-settings-card-body">
            <FormField
              control={form.control}
              name="booking_buffer_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Buffer (minutes)</FormLabel>
                  <FormDescription>Gap required between consecutive bookings</FormDescription>
                  <FormControl>
                    <Input type="number" min={0} {...field} className="dash-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cancellation_policy.policy_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation Policy</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} className="dash-input min-h-[88px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="dash-settings-field-grid dash-settings-field-grid--three">
              <FormField
                control={form.control}
                name="cancellation_policy.free_cancel_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Free cancel (hours)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} className="dash-input" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cancellation_policy.partial_refund_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partial refund (hours)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} className="dash-input" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cancellation_policy.partial_refund_pct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partial refund %</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} className="dash-input" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </DashCardContent>
        </DashCard>

        <DashCard hover={false} className="dash-settings-card" data-dash-animate>
          <DashCardHeader>
            <DashCardTitle className="dash-card-title-lg">Checkout</DashCardTitle>
            <p className="dash-card-meta">Tax, deposit, and currency settings.</p>
          </DashCardHeader>
          <DashCardContent className="dash-settings-card-body dash-settings-field-grid dash-settings-field-grid--three">
            <FormField
              control={form.control}
              name="tax_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Rate (decimal)</FormLabel>
                  <FormDescription>e.g. 0.0825 = 8.25%</FormDescription>
                  <FormControl>
                    <Input type="number" step="0.0001" min={0} max={1} {...field} className="dash-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deposit_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit %</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min={0} max={100} {...field} className="dash-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input maxLength={3} {...field} className="dash-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </DashCardContent>
        </DashCard>

        <DashCard hover={false} className="dash-settings-card" data-dash-animate>
          <DashCardHeader>
            <DashCardTitle className="dash-card-title-lg">Customer Segmentation</DashCardTitle>
            <p className="dash-card-meta">
              Thresholds for automatic VIP customer classification.
            </p>
          </DashCardHeader>
          <DashCardContent className="dash-settings-card-body dash-settings-field-grid dash-settings-field-grid--two">
            <FormField
              control={form.control}
              name="segmentation.vip_min_bookings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VIP minimum bookings</FormLabel>
                  <FormDescription>Completed bookings to auto-qualify as VIP</FormDescription>
                  <FormControl>
                    <Input type="number" min={1} {...field} className="dash-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="segmentation.vip_min_spend"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VIP minimum spend</FormLabel>
                  <FormDescription>Total spend to auto-qualify as VIP</FormDescription>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" {...field} className="dash-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </DashCardContent>
        </DashCard>

        <div className="dash-settings-save-bar">
          <p className="dash-settings-save-hint">
            Policy and checkout changes apply to new bookings immediately.
          </p>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}
