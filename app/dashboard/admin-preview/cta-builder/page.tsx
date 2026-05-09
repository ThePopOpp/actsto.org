import { redirect } from "next/navigation";

export default function AdminPreviewCtaBuilderPage() {
  redirect("/dashboard/admin-preview/cms?tab=cta-blocks");
}
