import { AnalyticsPageSkeleton, DashboardPageSkeleton } from "@/components/skeletons/dashboard-skeleton";
import {
  AccountSettingsSkeleton,
  MarinaStorefrontSkeleton,
  MyTripsSkeleton,
} from "@/components/skeletons/consumer-skeleton";
import { BookingsTableSkeleton } from "@/components/skeletons/bookings-skeleton";
import { BookingDetailLoading } from "@/components/skeletons/booking-detail-skeleton";
import { CalendarSkeleton } from "@/components/skeletons/calendar-skeleton";
import { CustomersTableSkeleton } from "@/components/skeletons/customers-skeleton";
import { FleetTableSkeleton } from "@/components/skeletons/fleet-skeleton";
import { PaymentsSkeleton } from "@/components/skeletons/payments-skeleton";
import { SettingsSkeleton } from "@/components/skeletons/settings-skeleton";
import { cn } from "@/lib/utils";

export function PageSkeleton({
  variant = "default",
  className,
}: {
  variant?:
    | "default"
    | "stats"
    | "table"
    | "calendar"
    | "charts"
    | "grid"
    | "detail"
    | "account"
    | "form"
    | "payments"
    | "trip-list";
  className?: string;
}) {
  if (variant === "stats") {
    return (
      <div className={cn(className)}>
        <DashboardPageSkeleton />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn(className)}>
        <BookingsTableSkeleton />
      </div>
    );
  }

  if (variant === "calendar") {
    return (
      <div className={cn(className)}>
        <CalendarSkeleton />
      </div>
    );
  }

  if (variant === "charts") {
    return (
      <div className={cn(className)}>
        <AnalyticsPageSkeleton />
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className={cn(className)}>
        <FleetTableSkeleton />
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className={cn(className)}>
        <BookingDetailLoading />
      </div>
    );
  }

  if (variant === "account") {
    return (
      <div className={cn(className)}>
        <AccountSettingsSkeleton />
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn(className)}>
        <SettingsSkeleton />
      </div>
    );
  }

  if (variant === "payments") {
    return (
      <div className={cn(className)}>
        <PaymentsSkeleton />
      </div>
    );
  }

  if (variant === "trip-list") {
    return (
      <div className={cn(className)}>
        <MyTripsSkeleton />
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      <MarinaStorefrontSkeleton />
    </div>
  );
}
