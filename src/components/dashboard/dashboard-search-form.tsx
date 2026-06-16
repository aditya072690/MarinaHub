"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function DashboardSearchForm({
  placeholder = "Search…",
  paramName = "search",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");

  useEffect(() => {
    setValue(searchParams.get(paramName) ?? "");
  }, [searchParams, paramName]);

  const applySearch = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("cursor");
      const trimmed = next.trim();
      if (trimmed) params.set(paramName, trimmed);
      else params.delete(paramName);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, paramName, router, searchParams]
  );

  useEffect(() => {
    const current = searchParams.get(paramName) ?? "";
    if (value === current) return;

    const handle = window.setTimeout(() => applySearch(value), 350);
    return () => window.clearTimeout(handle);
  }, [value, applySearch, searchParams, paramName]);

  return (
    <div className="fleet-toolbar-search relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A6580]"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-10 border-[rgba(11,31,58,0.12)] bg-white pl-9 text-sm shadow-sm focus-visible:ring-[#1A9DC4]"
        aria-label={placeholder}
      />
    </div>
  );
}
