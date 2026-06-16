import { z } from "zod";

export const customerSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
