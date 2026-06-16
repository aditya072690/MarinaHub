"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption<T extends string> = {
  value: T;
  label: string;
};

export function DashboardSortSelect<T extends string>({
  value,
  onValueChange,
  options,
  label = "Sort by",
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SortOption<T>[];
  label?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as T)}>
      <SelectTrigger
        className="fleet-toolbar-select h-10 border-[rgba(11,31,58,0.12)] bg-white text-sm shadow-sm"
        aria-label={label}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
