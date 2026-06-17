const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
};

/** Platform default — Indian Rupees */
export const DEFAULT_CURRENCY = "INR";

function localeForCurrency(code: string): string | undefined {
  if (code === "INR") return "en-IN";
  if (code === "USD") return "en-US";
  return undefined;
}

export function formatCurrency(
  amount: number | string,
  currency = DEFAULT_CURRENCY,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const value = Number(amount);
  const code = currency.toUpperCase();
  const minDigits = options?.minimumFractionDigits ?? 2;
  const maxDigits = options?.maximumFractionDigits ?? minDigits;

  try {
    return new Intl.NumberFormat(localeForCurrency(code), {
      style: "currency",
      currency: code,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(value);
  } catch {
    const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
    return `${symbol}${value.toFixed(minDigits)}`;
  }
}

/** Stripe Checkout / Balance amounts use minor units (paise for INR, cents for USD). */
export function toStripeMinorUnits(amountInMajor: number): number {
  return Math.round(amountInMajor * 100);
}

export function fromStripeMinorUnits(minor: number): number {
  return minor / 100;
}

export function formatCurrencyFromMinorUnits(
  minor: number,
  currency = DEFAULT_CURRENCY
): string {
  return formatCurrency(fromStripeMinorUnits(minor), currency);
}

export function stripeCurrencyCode(currency = DEFAULT_CURRENCY): string {
  return currency.toLowerCase();
}

/** Human-readable rate suffix, e.g. "₹1,250/hr" */
export function formatHourlyRate(
  amount: number,
  currency = DEFAULT_CURRENCY
): string {
  return `${formatCurrency(amount, currency, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}/hr`;
}
