"use client";

import { changePassword, updateAccountSettings } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const inputClassName =
  "h-11 rounded-lg border-marina-border bg-white text-marina-navy focus-visible:border-marina-teal focus-visible:ring-marina-teal/30";

const sectionClassName =
  "space-y-5 rounded-lg border border-marina-border p-4 sm:p-6";

export function AccountSettingsForm({
  defaultSettings,
}: {
  defaultSettings: { email_notifications: boolean; booking_reminders: boolean };
}) {
  const [emailNotifications, setEmailNotifications] = useState(
    defaultSettings.email_notifications
  );
  const [bookingReminders, setBookingReminders] = useState(
    defaultSettings.booking_reminders
  );
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function savePreferences() {
    setSavingPrefs(true);
    const result = await updateAccountSettings({
      email_notifications: emailNotifications,
      booking_reminders: bookingReminders,
    });
    setSavingPrefs(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Preferences saved");
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    const result = await changePassword({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    setSavingPassword(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Password updated");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="space-y-6">
      <section className={sectionClassName}>
        <div>
          <h2 className="text-base font-semibold text-marina-navy">
            Notifications
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose how MarinaHub keeps you updated about your trips.
          </p>
        </div>
        <div className="divide-y divide-marina-border">
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-marina-navy">
                Email notifications
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Receive booking confirmations by email
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-marina-navy">
                Booking reminders
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Get reminded before upcoming trips
              </p>
            </div>
            <Switch
              checked={bookingReminders}
              onCheckedChange={setBookingReminders}
            />
          </div>
        </div>
        <Button
          onClick={savePreferences}
          disabled={savingPrefs}
          className="h-11 w-full rounded-lg bg-marina-teal font-semibold text-white hover:bg-teal-700 sm:w-auto sm:min-w-[9.5rem]"
        >
          {savingPrefs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save preferences
        </Button>
      </section>

      <section className={sectionClassName}>
        <div>
          <h2 className="text-base font-semibold text-marina-navy">
            Change password
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Use a strong password with at least 12 characters.
          </p>
        </div>
        <form onSubmit={savePassword} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="current" className="text-[13px] font-medium text-slate-700">
              Current password
            </Label>
            <PasswordInput
              id="current"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={inputClassName}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new" className="text-[13px] font-medium text-slate-700">
              New password
            </Label>
            <PasswordInput
              id="new"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
              className={inputClassName}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-[13px] font-medium text-slate-700">
              Confirm new password
            </Label>
            <PasswordInput
              id="confirm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={12}
              className={inputClassName}
            />
          </div>
          <Button
            type="submit"
            disabled={savingPassword}
            className="h-11 w-full rounded-lg bg-marina-teal font-semibold text-white hover:bg-teal-700 sm:w-auto sm:min-w-[9.5rem]"
          >
            {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </section>
    </div>
  );
}
