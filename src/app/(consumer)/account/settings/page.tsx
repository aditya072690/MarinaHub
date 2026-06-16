import { AccountSettingsForm } from "@/components/consumer/account-settings-form";
import { AccountPageHeader } from "@/components/consumer/account-page-header";
import { getAccountSettings } from "@/actions/profile";

export default async function AccountSettingsPage() {
  const defaultSettings = await getAccountSettings();

  return (
    <div>
      <AccountPageHeader
        title="Settings"
        description="Manage notifications and account security"
      />
      <AccountSettingsForm defaultSettings={defaultSettings} />
    </div>
  );
}
