import { redirect } from "next/navigation";

export default function GmailSuccess() {
  redirect("/onboarding?gmail=connected");
}
