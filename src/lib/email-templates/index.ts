export type EmailTemplateId = "confirmation" | "reminder" | "cancellation";

export interface EmailTemplate {
  id: EmailTemplateId;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "confirmation",
    name: "Booking Confirmation",
    subject: "Your booking at {{marina_name}} is confirmed",
    body: `Hi {{customer_name}},

Your booking is confirmed!

Boat: {{boat_name}}
Date: {{start_at}}
Guests: {{guest_count}}
Total: {{total_price}}

View your digital ticket: {{ticket_url}}

See you on the water!
{{marina_name}}`,
    variables: [
      "customer_name",
      "marina_name",
      "boat_name",
      "start_at",
      "guest_count",
      "total_price",
      "ticket_url",
    ],
  },
  {
    id: "reminder",
    name: "Booking Reminder",
    subject: "Reminder: Your trip tomorrow at {{marina_name}}",
    body: `Hi {{customer_name}},

This is a friendly reminder about your upcoming booking.

Boat: {{boat_name}}
Date: {{start_at}}
Guests: {{guest_count}}

View your ticket: {{ticket_url}}

{{marina_name}}`,
    variables: [
      "customer_name",
      "marina_name",
      "boat_name",
      "start_at",
      "guest_count",
      "ticket_url",
    ],
  },
  {
    id: "cancellation",
    name: "Booking Cancellation",
    subject: "Your booking at {{marina_name}} has been cancelled",
    body: `Hi {{customer_name}},

Your booking has been cancelled.

Boat: {{boat_name}}
Original date: {{start_at}}
Reason: {{cancellation_reason}}

If you have questions, contact us at {{contact_email}}.

{{marina_name}}`,
    variables: [
      "customer_name",
      "marina_name",
      "boat_name",
      "start_at",
      "cancellation_reason",
      "contact_email",
    ],
  },
];

export const SAMPLE_TEMPLATE_DATA: Record<string, string> = {
  customer_name: "Alex Rivera",
  marina_name: "Sunset Lake Marina",
  boat_name: "Sea Breeze 24",
  start_at: "Saturday, Jun 14, 2026 at 10:00 AM",
  guest_count: "4",
  total_price: "$320.00",
  ticket_url: "https://marinahub.app/m/sunset-lake/booking/ticket/abc123",
  cancellation_reason: "Weather conditions",
  contact_email: "hello@sunsetlake.com",
};

export function renderTemplate(template: EmailTemplate, data: Record<string, string>) {
  let subject = template.subject;
  let body = template.body;
  for (const [key, value] of Object.entries(data)) {
    const token = `{{${key}}}`;
    subject = subject.replaceAll(token, value);
    body = body.replaceAll(token, value);
  }
  return { subject, body };
}
