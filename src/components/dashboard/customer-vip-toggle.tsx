"use client";

import { toggleCustomerVip } from "@/actions/customer-segments";
import { CustomerSegmentBadge } from "@/components/dashboard/customer-segment-badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CustomerSegment } from "@/types/database";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function CustomerVipToggle({
  marinaId,
  customerId,
  isVip,
  segment,
}: {
  marinaId: string;
  customerId: string;
  isVip: boolean;
  segment: CustomerSegment | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [vip, setVip] = useState(isVip);

  async function handleToggle(checked: boolean) {
    setSaving(true);
    setVip(checked);
    const result = await toggleCustomerVip(marinaId, customerId, checked);
    setSaving(false);
    if (!result.success) {
      setVip(!checked);
      toast.error(result.error);
      return;
    }
    toast.success(checked ? "Customer marked as VIP" : "VIP flag removed");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
      {segment && <CustomerSegmentBadge segment={segment} />}
      <div className="flex items-center gap-3">
        <Switch
          id="vip-toggle"
          checked={vip}
          disabled={saving}
          onCheckedChange={handleToggle}
        />
        <Label htmlFor="vip-toggle" className="font-normal">
          Manual VIP override
        </Label>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
