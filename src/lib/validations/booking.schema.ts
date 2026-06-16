import { z } from "zod";

export const bookingSchema = z
  .object({
    boat_id: z.string().uuid(),
    customer_id: z.string().uuid().optional(),
    customer: z
      .object({
        full_name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
      })
      .optional(),
    start_at: z.string().datetime({ offset: true }),
    end_at: z.string().datetime({ offset: true }),
    guest_count: z.coerce.number().int().min(1).max(100).default(1),
    notes: z.string().max(1000).optional(),
    addon_ids: z.array(z.string().uuid()).optional(),
    waiver_accepted: z.boolean().optional(),
  })
  .refine((data) => new Date(data.end_at) > new Date(data.start_at), {
    message: "End time must be after start time",
    path: ["end_at"],
  });

export const publicBookingSchema = z
  .object({
    boat_id: z.string().uuid(),
    start_at: z.string().datetime({ offset: true }),
    end_at: z.string().datetime({ offset: true }),
    guest_count: z.number().int().min(1).max(100),
    customer: z.object({
      full_name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
    }),
    notes: z.string().max(1000).optional(),
    addon_ids: z.array(z.string().uuid()).optional(),
    waiver_accepted: z.boolean().optional(),
    waiver_signature: z.string().optional(),
    waiver_url: z.string().optional(),
  })
  .refine((data) => new Date(data.end_at) > new Date(data.start_at), {
    message: "End time must be after start time",
    path: ["end_at"],
  });

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const authSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  full_name: z.string().min(1).optional(),
});

export const marinaSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().max(2000).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().max(20).optional(),
  timezone: z.string().default("America/New_York"),
});

/** Checkout form — times come from selected slot, not form fields. */
export const bookingCheckoutFormSchema = z.object({
  boat_id: z.string().uuid(),
  guest_count: z.number().int().min(1).max(100),
  customer: z.object({
    full_name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  notes: z.string().max(1000).optional(),
  addon_ids: z.array(z.string().uuid()).optional(),
  waiver_accepted: z.boolean().optional(),
  waiver_signature: z.string().optional(),
});

export type BookingFormValues = z.infer<typeof bookingSchema>;
export type PublicBookingFormValues = z.infer<typeof publicBookingSchema>;
export type BookingCheckoutFormValues = z.infer<typeof bookingCheckoutFormSchema>;
