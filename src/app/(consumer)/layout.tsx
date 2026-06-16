import { ConsumerHeader } from "@/components/consumer/consumer-header";

export default async function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <ConsumerHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
