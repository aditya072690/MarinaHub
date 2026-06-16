"use client";

import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const QRCodeSVG = dynamic(() => import("react-qr-code"), {
  ssr: false,
  loading: () => (
    <Skeleton className="h-[160px] w-[160px] rounded-lg" aria-label="Loading QR code" />
  ),
});

export function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  return (
    <div className="inline-block rounded-lg bg-white p-4" aria-label="Booking QR code">
      <QRCodeSVG value={value} size={size} />
    </div>
  );
}
