import { redirect } from "next/navigation";

export default function AdminCtaBuilderPage() {
  redirect("/dashboard/admin/cms?tab=cta-blocks");
}
