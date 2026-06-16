export type UserRole = "owner" | "manager" | "staff";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "completed"
  | "no_show";
export type MaintenanceStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";
export type StripeConnectStatus =
  | "not_connected"
  | "pending"
  | "connected"
  | "restricted";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";
export type PaymentTransactionType =
  | "checkout"
  | "refund"
  | "payout"
  | "platform_fee"
  | "adjustment";
export type PaymentTransactionStatus = "pending" | "succeeded" | "failed";
export type MockTransactionType =
  | "booking_charge"
  | "payout"
  | "refund"
  | "platform_fee";
export type MockTransactionStatus = "pending" | "completed" | "failed";
export type BlockReason =
  | "maintenance"
  | "owner_hold"
  | "weather"
  | "manual"
  | "other";
export type BoatStatus = "active" | "inactive" | "maintenance";
export type NotificationType =
  | "new_booking"
  | "booking_cancelled"
  | "boat_unavailable"
  | "booking_confirmed"
  | "booking_checked_in"
  | "booking_checked_out"
  | "booking_reminder_ui_only"
  | "waitlist_available";
export type PricingRuleType = "weekday" | "weekend" | "holiday" | "peak_season";
export type AuditLogVisibility = "staff" | "owner_only";
export type WaitlistStatus = "active" | "notified" | "converted" | "expired" | "cancelled";
export type CustomerSegment = "first_time" | "returning" | "vip";
export type OnboardingStep =
  | "marina_details"
  | "add_boats"
  | "set_availability"
  | "launch_widget";

export interface Marina {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  timezone: string;
  logo_url: string | null;
  primary_color: string;
  contact_email: string | null;
  contact_phone: string | null;
  lat: number | null;
  lng: number | null;
  display_hours: Record<string, unknown> | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  settings: {
    email_notifications?: boolean;
    booking_reminders?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface MarinaMember {
  id: string;
  marina_id: string;
  user_id: string;
  role: UserRole;
  invited_by: string | null;
  joined_at: string;
}

export interface Boat {
  id: string;
  marina_id: string;
  name: string;
  description: string | null;
  boat_type: string | null;
  capacity: number;
  hourly_rate: number;
  daily_rate: number | null;
  status: BoatStatus;
  image_urls: string[];
  amenities: string[];
  min_booking_hours: number;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BoatRatingStats {
  boat_id: string;
  marina_id: string;
  review_count: number;
  avg_rating: number;
}

export interface Review {
  id: string;
  booking_id: string;
  user_id: string;
  boat_id: string;
  marina_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  marina_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  notes: string | null;
  user_id: string | null;
  total_bookings: number;
  total_spent: number;
  last_booking_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  marina_id: string;
  boat_id: string;
  customer_id: string;
  status: BookingStatus;
  start_at: string;
  end_at: string;
  total_price: number;
  deposit_amount: number;
  guest_count: number;
  notes: string | null;
  source: string;
  created_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  checked_out_at: string | null;
  checked_out_by: string | null;
  ticket_token: string | null;
  base_price: number | null;
  addons_total: number;
  tax_amount: number | null;
  pricing_rule_id: string | null;
  pricing_breakdown: Record<string, unknown> | null;
  waiver_accepted_at: string | null;
  waiver_accepted_by: string | null;
  waiver_url: string | null;
  payment_status: PaymentStatus;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  boat?: Boat;
  customer?: Customer;
  booking_addons?: BookingAddon[];
}

export interface BookingStatusHistory {
  id: string;
  booking_id: string;
  marina_id: string;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  changed_by: string | null;
  actor_role: UserRole | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  changed_by_profile?: Profile | null;
}

export interface Favorite {
  id: string;
  user_id: string;
  boat_id: string;
  marina_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  marina_id: string | null;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface OnboardingState {
  id: string;
  marina_id: string;
  current_step: OnboardingStep;
  completed_steps: OnboardingStep[];
  step_data: Record<string, unknown>;
  is_complete: boolean;
  completed_at: string | null;
  updated_at: string;
}

export interface AvailabilityBlock {
  id: string;
  marina_id: string;
  boat_id: string | null;
  reason: BlockReason;
  start_at: string;
  end_at: string;
  title: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface MaintenanceLog {
  id: string;
  marina_id: string;
  boat_id: string;
  status: MaintenanceStatus;
  scheduled_at: string;
  completed_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  boats?: Boat;
}

export interface AddonCatalogItem {
  id: string;
  marina_id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BookingAddon {
  id: string;
  booking_id: string;
  marina_id: string;
  addon_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  addon_catalog?: AddonCatalogItem;
}

export interface MarinaPaymentAccount {
  id: string;
  marina_id: string;
  stripe_status: StripeConnectStatus;
  stripe_account_id: string | null;
  platform_fee_pct: number;
  connected_at: string | null;
  stripe_onboarding_complete: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  marina_id: string;
  booking_id: string | null;
  type: PaymentTransactionType;
  status: PaymentTransactionStatus;
  amount_cents: number;
  currency: string;
  platform_fee_cents: number;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_payout_id: string | null;
  stripe_event_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MockTransaction {
  id: string;
  marina_id: string;
  booking_id: string | null;
  type: MockTransactionType;
  status: MockTransactionStatus;
  amount: number;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WidgetConfig {
  id: string;
  marina_id: string;
  allowed_origins: string[];
  theme: Record<string, unknown>;
  is_enabled: boolean;
  api_key_hash: string;
  created_at: string;
  updated_at: string;
}

export interface BookingWithRelations extends Booking {
  boats: Boat;
  customers: Customer;
}

export interface BusinessHoursDay {
  open: string;
  close: string;
  closed: boolean;
}

export type BusinessHours = Record<string, BusinessHoursDay>;

export interface CancellationPolicy {
  free_cancel_hours: number;
  partial_refund_hours: number;
  partial_refund_pct: number;
  policy_text: string;
}

export interface MarinaSettings {
  marina_id: string;
  business_hours: BusinessHours;
  booking_buffer_minutes: number;
  cancellation_policy: CancellationPolicy;
  tax_rate: number;
  deposit_pct: number;
  currency: string;
  timezone: string;
  segmentation: { vip_min_bookings: number; vip_min_spend: number };
  updated_at: string;
  updated_by: string | null;
}

export interface PricingRule {
  id: string;
  marina_id: string;
  boat_id: string | null;
  rule_type: PricingRuleType;
  priority: number;
  hourly_rate: number | null;
  daily_rate: number | null;
  rate_multiplier: number | null;
  peak_start: string | null;
  peak_end: string | null;
  holiday_date: string | null;
  holiday_name: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface MarinaHoliday {
  id: string;
  marina_id: string;
  date: string;
  name: string;
  is_recurring: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  marina_id: string;
  actor_id: string | null;
  actor_role: UserRole | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  visibility: AuditLogVisibility;
  show_in_feed: boolean;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  marina_id: string;
  boat_id: string | null;
  customer_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  desired_start_at: string;
  desired_end_at: string;
  guest_count: number;
  status: WaitlistStatus;
  notified_at: string | null;
  converted_booking_id: string | null;
  expires_at: string;
  created_at: string;
}

export interface CustomerSegmentSnapshot {
  customer_id: string;
  marina_id: string;
  segment: CustomerSegment;
  completed_bookings: number;
  total_spent: number;
  last_booking_at: string | null;
  computed_at: string;
}

export interface PriceQuote {
  base_price: number;
  tax_amount: number;
  deposit_amount: number;
  total_price: number;
  pricing_rule_id: string | null;
  rule_type: PricingRuleType;
  rule_label: string;
  hourly_rate: number;
  daily_rate: number | null;
  hours: number;
  currency: string;
  breakdown: Record<string, unknown>;
}

export interface AlternativeBoat {
  boat_id: string;
  name: string;
  capacity: number;
  boat_type: string | null;
  image_url: string | null;
  estimated_total: number;
  estimated_base: number;
  rule_label: string;
  score: number;
  availability_confirmed: boolean;
}

export interface RevenueForecast {
  marina_id: string;
  period: { start: string; end: string };
  total_forecast: number;
  confirmed_portion: number;
  projected_portion: number;
  daily: {
    date: string;
    confirmed: number;
    projected: number;
    total: number;
    booking_count: number;
  }[];
  confidence: "high" | "medium" | "low";
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDef<T> = {
  Row: T;
  Insert: { [K in keyof T]?: T[K] };
  Update: { [K in keyof T]?: T[K] };
};

export interface Database {
  public: {
    Tables: {
      marinas: TableDef<Marina>;
      profiles: TableDef<Profile>;
      marina_members: TableDef<MarinaMember>;
      boats: TableDef<Boat>;
      customers: TableDef<Customer>;
      bookings: TableDef<Booking>;
      availability_blocks: TableDef<AvailabilityBlock>;
      widget_configs: TableDef<WidgetConfig>;
      booking_status_history: TableDef<BookingStatusHistory>;
      favorites: TableDef<Favorite>;
      notifications: TableDef<Notification>;
      onboarding_state: TableDef<OnboardingState>;
      maintenance_logs: TableDef<MaintenanceLog>;
      addon_catalog: TableDef<AddonCatalogItem>;
      booking_addons: TableDef<BookingAddon>;
      marina_payment_accounts: TableDef<MarinaPaymentAccount>;
      payment_transactions: TableDef<PaymentTransaction>;
      mock_transactions: TableDef<MockTransaction>;
      marina_settings: TableDef<MarinaSettings>;
      pricing_rules: TableDef<PricingRule>;
      marina_holidays: TableDef<MarinaHoliday>;
      audit_logs: TableDef<AuditLog>;
      waitlist_entries: TableDef<WaitlistEntry>;
      customer_segment_snapshots: TableDef<CustomerSegmentSnapshot>;
      reviews: TableDef<Review>;
      boat_rating_stats: TableDef<BoatRatingStats>;
    };
    Functions: {
      is_boat_available: {
        Args: {
          p_boat_id: string;
          p_start: string;
          p_end: string;
          p_exclude_booking_id?: string;
        };
        Returns: boolean;
      };
      auth_user_marina_ids: { Args: Record<string, never>; Returns: string[] };
      auth_user_role: { Args: { p_marina_id: string }; Returns: UserRole };
      link_customers_for_user: {
        Args: { p_user_id: string; p_email: string };
        Returns: number;
      };
      get_marina_analytics_summary: {
        Args: { p_marina_id: string };
        Returns: Json;
      };
      update_customer_contact: {
        Args: {
          p_customer_id: string;
          p_full_name: string;
          p_phone: string;
        };
        Returns: undefined;
      };
      resolve_booking_price: {
        Args: { p_boat_id: string; p_start: string; p_end: string };
        Returns: Json;
      };
      insert_booking_addons: {
        Args: { p_booking_id: string; p_rows: Json };
        Returns: undefined;
      };
      suggest_alternative_boats: {
        Args: {
          p_marina_id: string;
          p_boat_id: string;
          p_start: string;
          p_end: string;
          p_guest_count?: number;
          p_limit?: number;
        };
        Returns: Json;
      };
      get_marina_activity_feed: {
        Args: { p_marina_id: string; p_limit?: number; p_cursor?: string };
        Returns: AuditLog[];
      };
      get_revenue_forecast: {
        Args: { p_marina_id: string; p_days?: number };
        Returns: Json;
      };
      join_waitlist: {
        Args: {
          p_marina_id: string;
          p_boat_id: string;
          p_desired_start: string;
          p_desired_end: string;
          p_guest_count: number;
          p_guest_name: string;
          p_guest_email: string;
          p_guest_phone?: string;
          p_customer_id?: string;
        };
        Returns: string;
      };
      refresh_customer_segments: {
        Args: { p_marina_id: string };
        Returns: number;
      };
      write_audit_log: {
        Args: {
          p_marina_id: string;
          p_action: string;
          p_entity_type: string;
          p_summary: string;
          p_entity_id?: string;
          p_metadata?: Json;
          p_visibility?: AuditLogVisibility;
          p_show_in_feed?: boolean;
        };
        Returns: string;
      };
      confirm_booking_payment: {
        Args: {
          p_booking_id: string;
          p_marina_id: string;
          p_session_id: string;
          p_payment_intent_id: string | null;
          p_amount_cents: number;
          p_platform_fee_cents: number;
          p_stripe_event_id: string;
          p_stripe_charge_id?: string | null;
        };
        Returns: boolean;
      };
    };
  };
}
