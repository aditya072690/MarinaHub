"use client";

import { EmptyState } from "@/components/shared/empty-state";
import {
  MobileDataCard,
  MobileDataField,
  ResponsiveDataView,
} from "@/components/shared/responsive-data-view";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyFromMinorUnits } from "@/lib/currency/format";
import type { PaymentTransaction } from "@/types/database";
import { CreditCard } from "lucide-react";
import { format } from "date-fns";

export function PaymentTransactionsTable({
  transactions,
  currency,
  usingEstimatedData = false,
}: {
  transactions: PaymentTransaction[];
  currency: string;
  usingEstimatedData?: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No transactions yet"
        description={
          usingEstimatedData
            ? "Paid bookings will appear here as estimated charges until Stripe Connect is active."
            : "Payment activity will appear here once Stripe Connect is active and guests pay online."
        }
      />
    );
  }

  const table = (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>{format(new Date(tx.created_at), "MMM d, yyyy")}</TableCell>
              <TableCell className="capitalize">{tx.type.replace("_", " ")}</TableCell>
              <TableCell>
                {formatCurrencyFromMinorUnits(tx.amount_cents, currency)}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    tx.status === "succeeded"
                      ? "bg-emerald-600 hover:bg-emerald-600"
                      : ""
                  }
                >
                  {tx.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const cards = transactions.map((tx) => (
    <MobileDataCard key={tx.id}>
      <MobileDataField label="Date">
        {format(new Date(tx.created_at), "MMM d, yyyy")}
      </MobileDataField>
      <MobileDataField label="Type">
        <span className="capitalize">{tx.type.replace("_", " ")}</span>
      </MobileDataField>
      <MobileDataField label="Amount">
        {formatCurrencyFromMinorUnits(tx.amount_cents, currency)}
      </MobileDataField>
      <MobileDataField label="Status">
        <Badge
          className={
            tx.status === "succeeded" ? "bg-emerald-600 hover:bg-emerald-600" : ""
          }
        >
          {tx.status}
        </Badge>
      </MobileDataField>
    </MobileDataCard>
  ));

  return <ResponsiveDataView table={table} cards={cards} />;
}
