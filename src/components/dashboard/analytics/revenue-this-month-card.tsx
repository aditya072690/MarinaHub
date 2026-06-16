import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency/format";
import { IndianRupee } from "lucide-react";

export function RevenueThisMonthCard({ amount }: { amount: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Revenue This Month
        </CardTitle>
        <IndianRupee className="h-4 w-4 text-emerald-600" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{formatCurrency(amount)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Confirmed & completed bookings
        </p>
      </CardContent>
    </Card>
  );
}
