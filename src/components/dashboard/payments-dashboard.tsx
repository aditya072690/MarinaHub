import { getPaymentSummary } from "@/actions/payments";
import {
  ConnectStripeButton,
  StripeStatusBadge,
} from "@/components/dashboard/connect-stripe-button";
import { ExportButton } from "@/components/dashboard/export-button";
import { PaymentTransactionsTable } from "@/components/dashboard/payment-transactions-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency/format";
import { connectStatusLabel } from "@/lib/payments/mock-stripe";
import type { StripeConnectStatus } from "@/types/database";
import { AlertCircle, CheckCircle2, CreditCard, Wallet } from "lucide-react";
import { format } from "date-fns";

export async function PaymentsDashboard({
  marinaId,
  marinaName,
}: {
  marinaId: string;
  marinaName: string;
}) {
  const summary = await getPaymentSummary(marinaId);
  const status = (summary.account?.stripe_status ?? "not_connected") as StripeConnectStatus;
  const feePct = (summary.account?.platform_fee_pct ?? 0.03) * 100;
  const isConnected = summary.account?.stripe_onboarding_complete ?? false;
  const currency = summary.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Payouts and revenue for {marinaName}</p>
        </div>
        <ExportButton type="revenue" label="Export Revenue" />
      </div>

      {!summary.stripeConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Stripe not configured</p>
            <p className="mt-1 text-amber-800/90">
              Add STRIPE_SECRET_KEY and related env vars to enable Stripe Connect Express
              (Test Mode).
            </p>
          </div>
        </div>
      )}

      {summary.stripeConfigured && summary.usingEstimatedData && !isConnected && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Connect Stripe to accept online payments</p>
            <p className="mt-1 text-blue-800/90">
              Revenue figures below are estimated from paid bookings until your account is
              fully connected.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#635BFF]" />
              Connected Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <StripeStatusBadge status={status} />
              {summary.maskedAccountId && (
                <span className="font-mono text-sm text-muted-foreground">
                  {summary.maskedAccountId}
                </span>
              )}
            </div>
            <p className="font-medium">{marinaName}</p>
            {isConnected && (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Charges enabled
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Payouts enabled
                </li>
              </ul>
            )}
            <ConnectStripeButton
              marinaId={marinaId}
              status={status}
              stripeConfigured={summary.stripeConfigured}
            />
            <p className="text-xs text-muted-foreground">
              Current status: {connectStatusLabel(status)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Revenue Summary (This Month)
              {summary.usingEstimatedData && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (estimated)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Gross revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.revenueThisMonth, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform fee ({feePct}%)</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.platformFees, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net payout</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(summary.netRevenue, currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.pendingPayouts.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No pending payouts"
              description={
                summary.usingEstimatedData
                  ? "Estimated payouts appear here once you have paid bookings this month."
                  : "Completed payments will show pending transfer amounts here."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expected date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.pendingPayouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      {formatCurrency(Number(p.amount), currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentTransactionsTable
            transactions={summary.recentTransactions}
            currency={currency}
            usingEstimatedData={summary.usingEstimatedData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
