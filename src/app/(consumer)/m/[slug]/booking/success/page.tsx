import { isStripeConfigured } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    redirect(`/m/${slug}`);
  }

  const supabase = await createClient();
  const { data: marina } = await supabase
    .from("marinas")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!marina) notFound();

  if (!isStripeConfigured()) {
    notFound();
  }

  let bookingId: string | undefined;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    bookingId = session.metadata?.booking_id;
  } catch {
    notFound();
  }

  if (!bookingId) {
    notFound();
  }

  redirect(`/m/${slug}/booking/confirmation/${bookingId}?session_id=${sessionId}`);
}
