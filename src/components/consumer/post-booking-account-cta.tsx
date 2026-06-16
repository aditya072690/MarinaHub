import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { UserPlus } from "lucide-react";
import Link from "next/link";

export async function PostBookingAccountCta({ email }: { email: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <Link href="/account/trips" className="block">
        <Button className="w-full bg-sky-600 hover:bg-sky-700">
          View in My Trips
        </Button>
      </Link>
    );
  }

  const signupUrl = `/account/signup?email=${encodeURIComponent(email)}`;

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
      <div className="mb-2 flex items-center gap-2 font-medium text-sky-900">
        <UserPlus className="h-4 w-4" />
        Save this trip to your account
      </div>
      <p className="mb-3 text-sm text-sky-800">
        Create a free account to track this booking, access your digital ticket
        anytime, and save favorite boats.
      </p>
      <Link href={signupUrl} className="block">
        <Button className="w-full bg-sky-600 hover:bg-sky-700">
          Create account
        </Button>
      </Link>
      <p className="mt-2 text-center text-xs text-sky-700">
        Already have an account?{" "}
        <Link
          href={`/account/login?email=${encodeURIComponent(email)}`}
          className="font-medium underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
