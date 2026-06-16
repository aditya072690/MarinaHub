import { formatCurrency } from "@/lib/currency/format";

export function PriceBreakdown({
  basePrice,
  addons,
  tax = 0,
  deposit,
  total,
  ruleLabel,
  currency = "INR",
}: {
  basePrice: number;
  addons: { name: string; price: number }[];
  tax?: number;
  deposit?: number;
  total: number;
  ruleLabel?: string;
  currency?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 space-y-2">
      {ruleLabel && (
        <div className="text-xs font-medium text-sky-700 bg-sky-100 inline-block px-2 py-0.5 rounded">
          {ruleLabel}
        </div>
      )}
      <div className="flex justify-between text-sm">
        <span>Base rental</span>
        <span>{formatCurrency(basePrice, currency)}</span>
      </div>
      {addons.map((addon) => (
        <div key={addon.name} className="flex justify-between text-sm">
          <span>{addon.name}</span>
          <span>{formatCurrency(addon.price, currency)}</span>
        </div>
      ))}
      {tax > 0 && (
        <div className="flex justify-between text-sm">
          <span>Tax (GST)</span>
          <span>{formatCurrency(tax, currency)}</span>
        </div>
      )}
      <div className="flex justify-between border-t pt-2 font-semibold">
        <span>Total</span>
        <span>{formatCurrency(total, currency)}</span>
      </div>
      {deposit != null && deposit > 0 && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Deposit due today</span>
          <span>{formatCurrency(deposit, currency)}</span>
        </div>
      )}
    </div>
  );
}
