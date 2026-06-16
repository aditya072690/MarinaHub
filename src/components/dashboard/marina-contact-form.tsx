"use client";

import { updateMarinaContact } from "@/actions/marina-contact";
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
import { createZodResolver } from "@/lib/forms/zod-resolver";
import type { Marina } from "@/types/database";
import { Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z
  .object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().max(2).optional().or(z.literal("")),
    contact_email: z.string().email().optional().or(z.literal("")),
    contact_phone: z.string().optional(),
    lat: z.string().optional(),
    lng: z.string().optional(),
  })
  .refine(
    (d) => {
      const hasLat = d.lat != null && d.lat !== "";
      const hasLng = d.lng != null && d.lng !== "";
      return hasLat === hasLng;
    },
    { message: "Both latitude and longitude are required", path: ["lng"] }
  );

type FormValues = z.infer<typeof schema>;

export function MarinaContactForm({
  marinaId,
  marina,
}: {
  marinaId: string;
  marina: Pick<
    Marina,
    | "contact_email"
    | "contact_phone"
    | "lat"
    | "lng"
    | "address"
    | "city"
    | "state"
    | "zip"
    | "country"
  >;
}) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: createZodResolver(schema),
    defaultValues: {
      address: marina.address ?? "",
      city: marina.city ?? "",
      state: marina.state ?? "",
      zip: marina.zip ?? "",
      country: marina.country ?? "IN",
      contact_email: marina.contact_email ?? "",
      contact_phone: marina.contact_phone ?? "",
      lat: marina.lat != null ? String(marina.lat) : "",
      lng: marina.lng != null ? String(marina.lng) : "",
    },
  });

  useEffect(() => {
    form.reset({
      address: marina.address ?? "",
      city: marina.city ?? "",
      state: marina.state ?? "",
      zip: marina.zip ?? "",
      country: marina.country ?? "IN",
      contact_email: marina.contact_email ?? "",
      contact_phone: marina.contact_phone ?? "",
      lat: marina.lat != null ? String(marina.lat) : "",
      lng: marina.lng != null ? String(marina.lng) : "",
    });
  }, [form, marina]);

  async function onSubmit(values: FormValues) {
    const lat = values.lat ? Number(values.lat) : null;
    const lng = values.lng ? Number(values.lng) : null;

    const result = await updateMarinaContact(marinaId, {
      address: values.address,
      city: values.city,
      state: values.state,
      zip: values.zip,
      country: values.country,
      contact_email: values.contact_email,
      contact_phone: values.contact_phone,
      lat,
      lng,
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Location and contact saved");
    router.refresh();
  }

  return (
    <DashCard hover={false} className="dash-settings-card" data-dash-animate>
      <DashCardHeader>
        <div className="dash-settings-card-heading">
          <div className="dash-settings-card-icon">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <DashCardTitle className="dash-card-title-lg">
              Location & Contact
            </DashCardTitle>
            <p className="dash-card-meta">
              Shown on the homepage, search, and marina profile as{" "}
              <span className="font-medium text-[#0B1F3A]">City, State</span>.
            </p>
          </div>
        </div>
      </DashCardHeader>
      <DashCardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="dash-settings-form">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Lake Shore Dr" className="dash-input" />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="dash-settings-field-grid dash-settings-field-grid--two">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Vadodara" required className="dash-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State / Region</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Gujarat" required className="dash-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="dash-settings-field-grid dash-settings-field-grid--two">
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="390001" className="dash-input" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country code</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={2} placeholder="IN" className="dash-input" />
                    </FormControl>
                    <FormDescription>ISO code, e.g. IN, US</FormDescription>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+91 98765 43210" className="dash-input" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="info@marina.demo" className="dash-input" />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="dash-settings-field-grid dash-settings-field-grid--two">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="22.3072" className="dash-input" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="73.1812" className="dash-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormDescription>
              Coordinates power the Explore Marinas map and weather forecasts.
            </FormDescription>
            <div className="dash-settings-save-bar">
              <p className="dash-settings-save-hint">
                Changes apply to search, maps, and your public marina profile.
              </p>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save location & contact
              </Button>
            </div>
          </form>
        </Form>
      </DashCardContent>
    </DashCard>
  );
}
