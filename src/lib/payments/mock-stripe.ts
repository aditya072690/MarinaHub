export type MockStripeStatus = "not_connected" | "pending" | "connected" | "restricted";

export function generateMockAccountId(marinaId: string): string {
  const suffix = marinaId.replace(/-/g, "").slice(0, 8);
  return `acct_demo_${suffix}`;
}

export function nextConnectStatus(
  current: MockStripeStatus
): MockStripeStatus {
  switch (current) {
    case "not_connected":
      return "pending";
    case "pending":
      return "connected";
    case "connected":
      return "not_connected";
    default:
      return "not_connected";
  }
}

export function connectStatusLabel(status: MockStripeStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "pending":
      return "Pending verification";
    case "restricted":
      return "Restricted";
    default:
      return "Not connected";
  }
}
