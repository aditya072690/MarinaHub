import { CustomerDetailSkeleton } from "@/components/skeletons/customers-skeleton";
import { SimplePageHeaderSkeleton } from "@/components/skeletons/loading-shell";

export default function CustomerDetailLoading() {
  return (
    <div className="space-y-6">
      <SimplePageHeaderSkeleton titleWidth="w-40" />
      <CustomerDetailSkeleton />
    </div>
  );
}
