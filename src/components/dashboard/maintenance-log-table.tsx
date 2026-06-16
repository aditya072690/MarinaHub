"use client";

import { createMaintenanceLog, deleteMaintenanceLog } from "@/actions/maintenance";
import { EmptyState } from "@/components/shared/empty-state";
import {
  MobileDataCard,
  MobileDataField,
  ResponsiveDataView,
} from "@/components/shared/responsive-data-view";
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
import { Textarea } from "@/components/ui/textarea";
import type { Boat, MaintenanceLog } from "@/types/database";
import { Loader2, Plus, Trash2, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function MaintenanceLogTable({
  logs,
  marinaId: _marinaId,
  canEdit,
}: {
  logs: MaintenanceLog[];
  marinaId: string;
  canEdit: boolean;
}) {
  const router = useRouter();

  async function handleDelete(id: string) {
    const result = await deleteMaintenanceLog(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Maintenance log deleted");
    router.refresh();
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="No maintenance logs"
        description={
          canEdit
            ? "Track repairs and inspections. Use Add maintenance log above to get started."
            : "Track repairs, inspections, and service history for your fleet."
        }
      />
    );
  }

  const table = (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Boat</th>
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Notes</th>
            {canEdit && <th className="px-4 py-3 text-right font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b last:border-0">
              <td className="px-4 py-3">{log.boats?.name ?? "—"}</td>
              <td className="px-4 py-3">
                {new Date(log.scheduled_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 capitalize">{log.status.replace("_", " ")}</td>
              <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                {log.notes ?? "—"}
              </td>
              {canEdit && (
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-[44px] text-red-600"
                    onClick={() => handleDelete(log.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const cards = logs.map((log) => (
    <MobileDataCard key={log.id}>
      <p className="mb-2 font-semibold">{log.boats?.name ?? "—"}</p>
      <MobileDataField label="Date">
        {new Date(log.scheduled_at).toLocaleDateString()}
      </MobileDataField>
      <MobileDataField label="Status">
        <span className="capitalize">{log.status.replace("_", " ")}</span>
      </MobileDataField>
      <MobileDataField label="Notes">{log.notes ?? "—"}</MobileDataField>
      {canEdit && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3 min-h-[44px] w-full text-destructive"
          onClick={() => handleDelete(log.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      )}
    </MobileDataCard>
  ));

  return <ResponsiveDataView table={table} cards={cards} />;
}

export function MaintenanceLogForm({
  marinaId,
  boats,
}: {
  marinaId: string;
  boats: Boat[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [boatId, setBoatId] = useState(boats[0]?.id ?? "");
  const [status, setStatus] = useState<MaintenanceLog["status"]>("scheduled");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [blockCalendar, setBlockCalendar] = useState(true);

  if (boats.length === 0) {
    return (
      <Button variant="outline" disabled title="Add boats to your fleet first">
        <Plus className="mr-2 h-4 w-4" />
        Add maintenance log
      </Button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!boatId || !scheduledAt) {
      toast.error("Boat and date are required");
      return;
    }
    setLoading(true);
    const result = await createMaintenanceLog(marinaId, {
      boat_id: boatId,
      status,
      scheduled_at: new Date(scheduledAt).toISOString(),
      notes,
      block_calendar: blockCalendar,
    });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Maintenance log created");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        id="maintenance-form-trigger"
        render={
          <Button className="bg-sky-600 hover:bg-sky-700">
            <Plus className="mr-2 h-4 w-4" />
            Add maintenance log
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New maintenance log</DialogTitle>
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
            <Label>Scheduled date</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as MaintenanceLog["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={blockCalendar}
              onChange={(e) => setBlockCalendar(e.target.checked)}
            />
            Block calendar for maintenance
          </label>
          <Button type="submit" disabled={loading} className="w-full bg-sky-600 hover:bg-sky-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save log
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
