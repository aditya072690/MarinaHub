import { redirect } from "next/navigation";

export default async function ConsumerLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; email?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams({ intent: "consumer" });
  if (params.redirect) qs.set("redirect", params.redirect);
  if (params.email) qs.set("email", params.email);
  redirect(`/auth/login?${qs.toString()}`);
}
