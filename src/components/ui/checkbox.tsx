"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function Checkbox({
  checked,
  onCheckedChange,
  className,
  id,
}: {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border border-slate-300",
        checked && "border-sky-600 bg-sky-600 text-white",
        className
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
  );
}
