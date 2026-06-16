import { TemplatePreview } from "@/components/dashboard/email-templates/template-preview";
import { canViewEmailTemplates } from "@/lib/auth/permissions";
import { getSessionContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function EmailTemplatesPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");

  if (!canViewEmailTemplates(session.activeRole)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <p className="text-muted-foreground">
          Preview booking email templates — delivery integration ready when you connect a provider.
        </p>
      </div>
      <TemplatePreview />
    </div>
  );
}
