import { redirect } from "next/navigation";

export default function MarinaSignupRedirect() {
  redirect("/auth/signup?intent=marina");
}
