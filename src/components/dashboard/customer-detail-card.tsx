import { BookingStatusBadge } from "@/components/dashboard/booking-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_TIMEZONE, formatInMarinaTimezone } from "@/lib/timezone";
import { formatCurrency } from "@/lib/currency/format";
import type { CustomerDetail } from "@/actions/customers";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

export function CustomerDetailCard({
  customer,
  timezone = DEFAULT_TIMEZONE,
  currency = "INR",
}: {
  customer: CustomerDetail;
  timezone?: string;
  currency?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{customer.total_bookings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(customer.total_spent, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Booking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {customer.last_booking_at
                ? formatInMarinaTimezone(
                    customer.last_booking_at,
                    timezone,
                    "MMM d, yyyy"
                  )
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {customer.bookings.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CalendarDays}
                title="No bookings for this customer"
                description="Booking history will appear once they reserve a trip."
                className="border-0 py-6"
              />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Boat</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customer.bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/bookings/${b.id}`}
                      className="font-medium text-sky-600 hover:underline"
                    >
                      {b.boats?.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatInMarinaTimezone(b.start_at, timezone, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <BookingStatusBadge status={b.status} />
                  </TableCell>
                  <TableCell>{formatCurrency(b.total_price, currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
