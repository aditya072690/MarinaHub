"use client";

import { createBlock, deleteBlock } from "@/actions/availability";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_TIMEZONE, formatInMarinaTimezone, marinaLocalToUtc } from "@/lib/timezone";
import type { AvailabilityBlock, Boat } from "@/types/database";
import { Plus, Trash2, Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AvailabilityBlocksManager({
  blocks,
  boats,
  marinaId,
  timezone = DEFAULT_TIMEZONE,
  canManage,
}: {
  blocks: AvailabilityBlock[];
  boats: Boat[];
  marinaId: string;
  timezone?: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [boatId, setBoatId] = useState<string>("");
  const [reason, setReason] = useState<AvailabilityBlock["reason"]>("maintenance");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const startDate = fd.get("start_date") as string;
    const startTime = fd.get("start_time") as string;
    const endDate = fd.get("end_date") as string;
    const endTime = fd.get("end_time") as string;

    const result = await createBlock(marinaId, {
      boat_id: boatId || null,
      reason,
      start_at: marinaLocalToUtc(startDate, startTime, timezone).toISOString(),
      end_at: marinaLocalToUtc(endDate, endTime, timezone).toISOString(),
      notes: (fd.get("notes") as string) || undefined,
    });

    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Block created");
    setShowForm(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const result = await deleteBlock(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Block removed");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Availability Blocks</h1>
        {canManage && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Block
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <Card>
          <CardHeader>
            <CardTitle>New Block</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Boat (optional — leave empty for marina-wide)</Label>
                <Select value={boatId} onValueChange={(v) => setBoatId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="All boats" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All boats</SelectItem>
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
                <Select
                  value={reason}
                  onValueChange={(v) =>
                    setReason((v as AvailabilityBlock["reason"]) ?? "maintenance")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="owner_hold">Owner Hold</SelectItem>
                    <SelectItem value="weather">Weather</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input name="start_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input name="start_time" type="time" defaultValue="08:00" required />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input name="end_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input name="end_time" type="time" defaultValue="17:00" required />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={loading}>
                  Create Block
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {blocks.length === 0 ? (
        <EmptyState
          icon={Ban}
          title="No blocks scheduled"
          description="Block dates for maintenance, weather, or owner holds."
          actionLabel={canManage ? "Add block" : undefined}
          onAction={canManage ? () => setShowForm(true) : undefined}
        />
      ) : (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Boat</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              {canManage && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
              {blocks.map((block) => (
                <TableRow key={block.id}>
                  <TableCell>
                    {block.boat_id
                      ? boats.find((b) => b.id === block.boat_id)?.name ?? "—"
                      : "All boats"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{block.reason}</Badge>
                  </TableCell>
                  <TableCell>
                    {formatInMarinaTimezone(block.start_at, timezone, "MMM d, h:mm a")}
                  </TableCell>
                  <TableCell>
                    {formatInMarinaTimezone(block.end_at, timezone, "MMM d, h:mm a")}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(block.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
