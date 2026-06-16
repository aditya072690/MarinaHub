import { redirect } from "next/navigation";

export default async function MarinaLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams({ intent: "marina" });
  if (params.redirect) qs.set("redirect", params.redirect);
  redirect(`/auth/login?${qs.toString()}`);
}
