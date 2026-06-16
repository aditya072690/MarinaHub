import { getCustomerDetail } from "@/actions/customers";
import { getCustomerSegmentSnapshot } from "@/actions/customer-segments";
import { getMarinaSettings } from "@/actions/marina-settings";
import { CustomerDetailCard } from "@/components/dashboard/customer-detail-card";
import { CustomerVipToggle } from "@/components/dashboard/customer-vip-toggle";
import { getSessionContext } from "@/lib/auth/session";
import { DEFAULT_CURRENCY } from "@/lib/currency/format";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  const customer = await getCustomerDetail(id);
  if (!customer) notFound();

  const [segmentSnapshot, marinaSettings] = await Promise.all([
    getCustomerSegmentSnapshot(session.activeMarina.id, customer.id),
    getMarinaSettings(session.activeMarina.id),
  ]);

  const isVip = customer.metadata?.vip === "true";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/customers" className="text-sm text-sky-600 hover:underline">
          ← Back to customers
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{customer.full_name}</h1>
        <p className="text-muted-foreground">{customer.email}</p>
        {customer.phone && (
          <p className="text-sm text-muted-foreground">{customer.phone}</p>
        )}
      </div>
      <CustomerVipToggle
        marinaId={session.activeMarina.id}
        customerId={customer.id}
        isVip={isVip}
        segment={segmentSnapshot?.segment ?? null}
      />
      <CustomerDetailCard
        customer={customer}
        timezone={session.activeMarina.timezone ?? DEFAULT_TIMEZONE}
        currency={marinaSettings?.currency ?? DEFAULT_CURRENCY}
      />
    </div>
  );
}
