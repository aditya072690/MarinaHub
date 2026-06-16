"use client";

import { createBlock, deleteBlock } from "@/actions/availability";
import { EmptyState } from "@/components/shared/empty-state";
import { BLOCK_REASON_LABELS } from "@/lib/availability/block-labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AvailabilityBlock, BlockReason, Boat } from "@/types/database";
import { CalendarOff, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const BLOCK_REASONS: BlockReason[] = ["maintenance", "owner_hold", "weather"];

export function BlockDateDialog({
  marinaId,
  boats,
  defaultBoatId,
}: {
  marinaId: string;
  boats: Boat[];
  defaultBoatId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [boatId, setBoatId] = useState(defaultBoatId ?? boats[0]?.id ?? "");
  const [reason, setReason] = useState<BlockReason>("maintenance");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [title, setTitle] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startAt || !endAt) {
      toast.error("Start and end dates are required");
      return;
    }
    setLoading(true);
    const result = await createBlock(marinaId, {
      boat_id: boatId || null,
      reason,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt).toISOString(),
      title: title || undefined,
    });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Date blocked");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <CalendarOff className="mr-2 h-4 w-4" />
            Block date
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block availability</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Boat</Label>
            <Select value={boatId} onValueChange={(v) => v && setBoatId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select boat" />
              </SelectTrigger>
              <SelectContent>
                {boats.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as BlockReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {BLOCK_REASON_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start</Label>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-sky-600 hover:bg-sky-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create block
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BlockList({
  blocks,
  canEdit,
}: {
  blocks: AvailabilityBlock[];
  canEdit: boolean;
}) {
  const router = useRouter();

  async function handleDelete(id: string) {
    const result = await deleteBlock(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Block removed");
    router.refresh();
  }

  if (blocks.length === 0) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="No active blocks"
        description="Scheduled blocks will appear here."
        className="border-0 py-4"
      />
    );
  }

  return (
    <div className="space-y-2">
      {blocks.map((block) => (
        <div
          key={block.id}
          className="flex items-center justify-between rounded-lg border p-3 text-sm"
        >
          <div>
            <p className="font-medium">
              {block.title ?? BLOCK_REASON_LABELS[block.reason]}
            </p>
            <p className="text-muted-foreground">
              {new Date(block.start_at).toLocaleString()} –{" "}
              {new Date(block.end_at).toLocaleString()}
            </p>
          </div>
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={() => handleDelete(block.id)}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
