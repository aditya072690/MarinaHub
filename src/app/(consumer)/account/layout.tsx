import { AccountShell } from "@/components/account/account-shell";
import { requireConsumerSession } from "@/lib/auth/consumer-session";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireConsumerSession();

  return (
    <div className="flex-1 bg-marina-fog px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full">
        <div className="overflow-hidden rounded-xl border border-marina-border bg-white shadow-sm">
          <AccountShell>{children}</AccountShell>
        </div>
      </div>
    </div>
  );
}
