import { z } from "zod";

const daySchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean(),
});

export const marinaSettingsSchema = z.object({
  business_hours: z.record(z.string(), daySchema),
  booking_buffer_minutes: z.coerce.number().int().min(0).max(480),
  cancellation_policy: z.object({
    free_cancel_hours: z.coerce.number().int().min(0),
    partial_refund_hours: z.coerce.number().int().min(0),
    partial_refund_pct: z.coerce.number().min(0).max(100),
    policy_text: z.string().min(1),
  }),
  tax_rate: z.coerce.number().min(0).max(1),
  deposit_pct: z.coerce.number().min(0).max(100),
  currency: z.string().length(3),
  segmentation: z.object({
    vip_min_bookings: z.coerce.number().int().min(1).max(100),
    vip_min_spend: z.coerce.number().min(0),
  }),
});

export const pricingRuleSchema = z.object({
  boat_id: z.string().uuid().nullable().optional(),
  rule_type: z.enum(["weekday", "weekend", "holiday", "peak_season"]),
  hourly_rate: z.coerce.number().positive().nullable().optional(),
  daily_rate: z.coerce.number().positive().nullable().optional(),
  rate_multiplier: z.coerce.number().positive().default(1),
  peak_start: z.string().nullable().optional(),
  peak_end: z.string().nullable().optional(),
  holiday_date: z.string().nullable().optional(),
  holiday_name: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const waitlistJoinSchema = z.object({
  boat_id: z.string().uuid(),
  desired_start_at: z.string().datetime(),
  desired_end_at: z.string().datetime(),
  guest_count: z.coerce.number().int().positive(),
  guest_name: z.string().min(1),
  guest_email: z.string().email(),
  guest_phone: z.string().optional(),
});
