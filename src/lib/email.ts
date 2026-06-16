import { Resend } from 'resend';
import { BookingConfirmationEmail } from '@/emails/booking-confirmation';
import { createAdminClient } from './supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_dev');

export async function sendBookingConfirmation(bookingId: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Skipping email dispatch.");
    return { success: true, simulated: true };
  }

  const supabase = createAdminClient();
  
  // Fetch booking details
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      id,
      start_at,
      end_at,
      total_price,
      ticket_token,
      customers ( full_name, email ),
      boats ( name ),
      marinas ( name, slug, timezone )
    `)
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    console.error("Failed to fetch booking for email:", error);
    return { success: false, error };
  }

  const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers;
  const boat = Array.isArray(booking.boats) ? booking.boats[0] : booking.boats;
  const marina = Array.isArray(booking.marinas) ? booking.marinas[0] : booking.marinas;

  if (!customer?.email) {
    return { success: false, error: "No customer email found" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const ticketUrl = booking.ticket_token 
    ? `${appUrl}/m/${marina?.slug}/ticket/${booking.ticket_token}`
    : `${appUrl}/m/${marina?.slug}/booking/confirmation/${booking.id}`;

  try {
    const data = await resend.emails.send({
      from: 'MarinaHub <bookings@marinahub.app>',
      to: customer.email,
      subject: `Booking Confirmed: ${boat?.name} at ${marina?.name}`,
      react: BookingConfirmationEmail({
        customerName: customer.full_name,
        boatName: boat?.name || 'Boat',
        marinaName: marina?.name || 'Marina',
        startAt: booking.start_at,
        endAt: booking.end_at,
        totalPrice: booking.total_price,
        timezone: marina?.timezone || 'America/Chicago',
        ticketUrl,
      }),
    });

    return { success: true, data };
  } catch (err) {
    console.error("Failed to send booking confirmation email:", err);
    return { success: false, error: err };
  }
}
