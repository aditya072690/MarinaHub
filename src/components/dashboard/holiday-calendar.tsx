"use client";

import { addMarinaHoliday, deleteMarinaHoliday } from "@/actions/pricing-rules";
import {
  DashCard,
  DashCardContent,
  DashCardHeader,
  DashCardTitle,
} from "@/components/dashboard/dash-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MarinaHoliday } from "@/types/database";
import { CalendarDays, Loader2, Trash2, CalendarOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function HolidayCalendar({
  marinaId,
  holidays,
}: {
  marinaId: string;
  holidays: MarinaHoliday[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  async function handleAdd() {
    if (!date || !name.trim()) {
      toast.error("Date and name are required");
      return;
    }
    setSaving(true);
    const result = await addMarinaHoliday(marinaId, date, name.trim(), isRecurring);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Holiday added");
    setDate("");
    setName("");
    setIsRecurring(false);
    router.refresh();
  }

  async function handleDelete(holidayId: string) {
    const result = await deleteMarinaHoliday(marinaId, holidayId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Holiday removed");
    router.refresh();
  }

  return (
    <DashCard hover={false} className="dash-settings-card">
      <DashCardHeader>
        <div className="dash-settings-card-heading">
          <div className="dash-settings-card-icon">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <DashCardTitle className="dash-card-title-lg">Holiday Calendar</DashCardTitle>
            <p className="dash-card-meta">
              Holidays apply holiday pricing rules. Recurring holidays repeat every year on
              the same month and day.
            </p>
          </div>
        </div>
      </DashCardHeader>
      <DashCardContent className="dash-settings-card-body">
        <div className="dash-holiday-form">
          <div className="dash-holiday-form-fields">
            <div className="dash-settings-field">
              <Label htmlFor="holiday-date">Date</Label>
              <Input
                id="holiday-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="dash-input"
              />
            </div>
            <div className="dash-settings-field">
              <Label htmlFor="holiday-name">Name</Label>
              <Input
                id="holiday-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Independence Day"
                className="dash-input"
              />
            </div>
          </div>
          <div className="dash-holiday-form-actions">
            <label className="dash-holiday-recurring" htmlFor="holiday-recurring">
              <Checkbox
                id="holiday-recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <span>Recurring yearly</span>
            </label>
            <Button onClick={handleAdd} disabled={saving} className="dash-holiday-submit">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Holiday
            </Button>
          </div>
        </div>

        {holidays.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="No holidays configured"
            description="Set holiday dates to apply special pricing rules."
            className="border-0 py-6"
          />
        ) : (
          <ul className="dash-holiday-list">
            {holidays.map((holiday) => (
              <li key={holiday.id} className="dash-holiday-item">
                <div className="dash-holiday-item-body">
                  <p className="dash-holiday-item-name">{holiday.name}</p>
                  <p className="dash-holiday-item-meta">
                    {holiday.date}
                    {holiday.is_recurring ? " · recurring" : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(holiday.id)}
                  aria-label={`Remove ${holiday.name}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DashCardContent>
    </DashCard>
  );
}
