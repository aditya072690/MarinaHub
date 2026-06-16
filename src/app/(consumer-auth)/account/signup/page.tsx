import { redirect } from "next/navigation";

export default async function ConsumerSignupRedirect({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams({ intent: "consumer" });
  if (params.redirect) qs.set("redirect", params.redirect);
  redirect(`/auth/signup?${qs.toString()}`);
}
