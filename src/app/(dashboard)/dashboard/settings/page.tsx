import { ensureMarinaSettings } from "@/actions/marina-settings";
import { getMarinaContactInfo } from "@/actions/marina-contact";
import { getBoats } from "@/actions/boats";
import { getPricingRules, getMarinaHolidays } from "@/actions/pricing-rules";
import { DashPageHeader } from "@/components/dashboard/dash-card";
import { HolidayCalendar } from "@/components/dashboard/holiday-calendar";
import { MarinaContactForm } from "@/components/dashboard/marina-contact-form";
import { MarinaSettingsForm } from "@/components/dashboard/marina-settings-form";
import { PricingRulesEditor } from "@/components/dashboard/pricing-rules-editor";
import { SettingsNavTabs } from "@/components/dashboard/settings/settings-nav-tabs";
import { canManageSettings } from "@/lib/auth/permissions";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");
  if (!canManageSettings(session.activeRole)) redirect("/dashboard");

  const marinaId = session.activeMarina.id;
  const [settings, rules, boats, holidays, contactInfo] = await Promise.all([
    ensureMarinaSettings(marinaId),
    getPricingRules(marinaId),
    getBoats(marinaId),
    getMarinaHolidays(marinaId),
    getMarinaContactInfo(marinaId),
  ]);

  return (
    <div className="dash-page dash-settings-page" data-dash-page>
      <DashPageHeader
        title="Marina Settings"
        description={`Configure operations, policies, and location for ${session.activeMarina.name}.`}
      />

      <SettingsNavTabs />

      <div className="dash-settings-stack">
        <MarinaContactForm
          key={`contact-${marinaId}-${contactInfo?.updated_at ?? "new"}`}
          marinaId={marinaId}
          marina={{
            contact_email: contactInfo?.contact_email ?? null,
            contact_phone: contactInfo?.contact_phone ?? null,
            lat: contactInfo?.lat ?? null,
            lng: contactInfo?.lng ?? null,
            address: contactInfo?.address ?? null,
            city: contactInfo?.city ?? null,
            state: contactInfo?.state ?? null,
            zip: contactInfo?.zip ?? null,
            country: contactInfo?.country ?? "IN",
          }}
        />

        <MarinaSettingsForm
          key={`settings-${settings.updated_at}`}
          marinaId={marinaId}
          settings={settings}
        />
      </div>

      <section className="dash-settings-section dash-settings-pricing" data-dash-animate>
        <div className="dash-section-header">
          <h2 className="dash-section-title">Dynamic Pricing</h2>
          <p className="dash-section-description">
            Manage holiday surcharges and automated pricing rules for your fleet.
          </p>
        </div>
        <HolidayCalendar marinaId={marinaId} holidays={holidays} />
        <PricingRulesEditor
            marinaId={marinaId}
            rules={rules}
            boats={boats}
            currency={settings.currency}
          />
      </section>
    </div>
  );
}
