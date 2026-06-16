"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface WaitlistFormProps {
  marinaId: string;
  boatId: string;
  startAt: string;
  endAt: string;
  guestCount: number;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  onSuccess?: () => void;
}

export function WaitlistForm({
  marinaId,
  boatId,
  startAt,
  endAt,
  guestCount,
  defaultName = "",
  defaultEmail = "",
  defaultPhone = "",
  onSuccess,
}: WaitlistFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/marinas/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marina_id: marinaId,
          boat_id: boatId,
          desired_start_at: startAt,
          desired_end_at: endAt,
          guest_count: guestCount,
          guest_name: name,
          guest_email: email,
          guest_phone: phone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to join waitlist");
        return;
      }
      setSubmitted(true);
      toast.success("You're on the waitlist!");
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="border-sky-200 bg-sky-50/50">
        <CardContent className="py-6 text-center">
          <p className="font-medium text-sky-900">You are on the waitlist!</p>
          <p className="mt-1 text-sm text-sky-700">
            Signed-in customers receive in-app alerts when a slot opens. Your contact
            info is saved so the marina can follow up.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Join Waitlist</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="wl-name">Name</Label>
            <Input id="wl-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wl-email">Email</Label>
            <Input
              id="wl-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wl-phone">Phone (optional)</Label>
            <Input id="wl-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Join Waitlist
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
