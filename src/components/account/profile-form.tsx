"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prefersReducedMotion } from "@/lib/animations/prefers-reduced-motion";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/types/api";
import type { Profile } from "@/types/database";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Loader2, Lock } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

gsap.registerPlugin(useGSAP);

export function ProfileForm({
  profile,
  action,
}: {
  profile: Profile;
  action: (values: unknown) => Promise<ActionResult<Profile>>;
}) {
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const successMsgRef = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".profile-field-group", {
        y: 16,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        stagger: 0.08,
        delay: 0.1,
      });
    },
    { scope: formRef }
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (buttonRef.current && !prefersReducedMotion()) {
      gsap.to(buttonRef.current, {
        scale: 0.97,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
      });
    }

    setPending(true);
    const fd = new FormData(e.currentTarget);
    const result = await action({
      full_name: fd.get("full_name"),
      phone: fd.get("phone") || undefined,
    });
    setPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    if (successMsgRef.current) {
      if (prefersReducedMotion()) {
        gsap.set(successMsgRef.current, { opacity: 1, x: 0 });
        gsap.to(successMsgRef.current, { opacity: 0, delay: 2.2, duration: 0.4 });
      } else {
        gsap.fromTo(
          successMsgRef.current,
          { opacity: 0, x: -8 },
          { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
        );
        gsap.to(successMsgRef.current, {
          opacity: 0,
          delay: 2.2,
          duration: 0.4,
        });
      }
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="w-full space-y-5"
    >
      <div className="profile-field-group space-y-1.5">
        <Label
          htmlFor="email"
          className="text-[13px] font-medium text-slate-700"
        >
          Email
        </Label>
        <div className="relative">
          <Input
            id="email"
            value={profile.email}
            disabled
            className="h-11 cursor-not-allowed rounded-lg border-marina-border bg-slate-50 pr-10 text-slate-400 focus-visible:ring-marina-teal/30"
          />
          <Lock
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
        </div>
        <p className="text-xs text-slate-400">
          Your sign-in email cannot be changed here.
        </p>
      </div>

      <div className="profile-field-group space-y-1.5">
        <Label
          htmlFor="full_name"
          className="text-[13px] font-medium text-slate-700"
        >
          Full name
        </Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={profile.full_name ?? ""}
          required
          className="h-11 rounded-lg border-marina-border bg-white text-marina-navy focus-visible:border-marina-teal focus-visible:ring-marina-teal/30"
        />
      </div>

      <div className="profile-field-group space-y-1.5">
        <Label
          htmlFor="phone"
          className="text-[13px] font-medium text-slate-700"
        >
          Phone
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={profile.phone ?? ""}
          className="h-11 rounded-lg border-marina-border bg-white text-marina-navy focus-visible:border-marina-teal focus-visible:ring-marina-teal/30"
          placeholder="(555) 555-0100"
        />
      </div>

      <div className="profile-field-group flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
        <Button
          ref={buttonRef}
          type="submit"
          className={cn(
            "h-11 w-full rounded-lg bg-marina-teal font-semibold text-white hover:bg-teal-700 sm:w-auto sm:min-w-[9.5rem]"
          )}
          disabled={pending}
        >
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
        <p
          ref={successMsgRef}
          className="text-sm font-medium text-marina-teal opacity-0"
          role="status"
          aria-live="polite"
        >
          Profile updated
        </p>
      </div>
    </form>
  );
}
