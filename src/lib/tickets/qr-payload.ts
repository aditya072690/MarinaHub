export function buildTicketUrl(
  baseUrl: string,
  marinaSlug: string,
  ticketToken: string
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/m/${marinaSlug}/booking/ticket/${ticketToken}`;
}

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
