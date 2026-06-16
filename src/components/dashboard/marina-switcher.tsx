"use client";

import { switchActiveMarina } from "@/actions/marina-switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useMarina } from "@/providers/marina-provider";
import { useQueryClient } from "@tanstack/react-query";
import { Anchor, Check, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function MarinaSwitcher({ sidebar = false }: { sidebar?: boolean }) {
  const { marina, role, memberships } = useMarina();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  if (memberships.length <= 1) {
    if (sidebar) {
      return (
        <div className="sb-marina-switcher sb-marina-switcher-static">
          <span className="sb-marina-switcher-name truncate">{marina.name}</span>
          <Badge variant="secondary" className="sb-marina-switcher-badge capitalize">
            {role}
          </Badge>
        </div>
      );
    }

    return (
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <Anchor className="h-4 w-4 shrink-0 text-sky-600" />
        <span className="hidden truncate sm:inline">{marina.name}</span>
        <Badge variant="secondary" className="capitalize text-xs">
          {role}
        </Badge>
      </div>
    );
  }

  async function handleSwitch(marinaId: string) {
    if (marinaId === marina.id) return;
    setSwitchingId(marinaId);
    startTransition(async () => {
      try {
        await switchActiveMarina(marinaId);
        queryClient.invalidateQueries();
        router.refresh();
        toast.success("Switched marina");
      } catch {
        toast.error("Failed to switch marina");
      } finally {
        setSwitchingId(null);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          sidebar
            ? "sb-marina-switcher"
            : "inline-flex h-8 max-w-[220px] items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
        )}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : sidebar ? null : (
          <Anchor className="h-4 w-4 shrink-0 text-sky-600" />
        )}
        <span className={cn("truncate", sidebar && "sb-marina-switcher-name")}>
          {marina.name}
        </span>
        <ChevronDown
          className={cn(
            sidebar ? "sb-marina-switcher-chevron" : "h-3 w-3 shrink-0 opacity-60"
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            Switch marina
            <Badge variant="secondary" className="capitalize text-xs font-normal">
              {role}
            </Badge>
          </DropdownMenuLabel>
          {memberships.map((m) => (
            <DropdownMenuItem
              key={m.marina_id}
              onClick={() => handleSwitch(m.marina_id)}
              className="flex items-center justify-between"
              disabled={pending && switchingId === m.marina_id}
            >
              <span className="truncate">{m.marinas.name}</span>
              {m.marina_id === marina.id && <Check className="h-4 w-4 text-sky-600" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
