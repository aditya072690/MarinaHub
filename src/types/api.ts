import type { Boat, Booking, Customer, Marina } from "./database";
import type { BoatUtilization } from "@/lib/analytics/utilization";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
}

export interface AvailabilityResponse {
  boat_id: string;
  slots: AvailabilitySlot[];
}

export interface PublicBookingRequest {
  boat_id: string;
  start_at: string;
  end_at: string;
  guest_count: number;
  customer: {
    full_name: string;
    email: string;
    phone?: string;
  };
  notes?: string;
}

export interface PublicBookingResponse {
  booking: Booking;
  customer: Customer;
}

export interface MarinaPublicProfile {
  marina: Marina;
  boats: Boat[];
}

export interface PopularBoat {
  id: string;
  name: string;
  bookingCount: number;
  revenue: number;
}

export interface AnalyticsSummary {
  totalBoats: number;
  totalBookings: number;
  totalRevenue: number;
  revenueThisMonth: number;
  upcomingTrips: number;
  monthlyBookings: { month: string; count: number; revenue: number }[];
  dailyBookings: { date: string; count: number; revenue: number }[];
  popularBoats: PopularBoat[];
  utilization: BoatUtilization[];
  avgRating?: number | null;
  reviewCount?: number;
}

export interface ConsumerTrip extends Booking {
  boats: Boat;
  marinas: Pick<Marina, "id" | "name" | "slug" | "timezone">;
  canReview?: boolean;
  reviewId?: string | null;
}

export interface MarinaWeatherProps {
  lat: number;
  lng: number;
  timezone?: string;
}
