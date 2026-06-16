import { updateProfile } from "@/actions/profile";
import { AccountPageHeader } from "@/components/consumer/account-page-header";
import { ProfileForm } from "@/components/account/profile-form";
import { createClient } from "@/lib/supabase/server";
import { requireConsumerSession } from "@/lib/auth/consumer-session";

export default async function AccountPage() {
  const user = await requireConsumerSession();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <div>
        <AccountPageHeader title="My Profile" />
        <p className="text-sm text-slate-500">
          Your profile is being set up. Please refresh in a moment or sign out
          and back in.
        </p>
      </div>
    );
  }

  return (
    <div>
      <AccountPageHeader
        title="My Profile"
        description="Manage your account details"
      />
      <ProfileForm profile={profile} action={updateProfile} />
    </div>
  );
}
