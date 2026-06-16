import { redirect } from "next/navigation";

export default function HistoryRedirect() {
  redirect("/account/trips?tab=past");
}
