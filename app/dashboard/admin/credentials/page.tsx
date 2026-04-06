import { AdminApiCredentialsForm } from "@/components/dashboard/admin/admin-api-credentials-form";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export default function AdminCredentialsPage() {
  return (
    <>
      <AdminPageHeader
        title="API & credentials"
        description="Rotate keys, scoped tokens, webhook secrets, and environment-backed secrets (never commit)."
      />
      <AdminApiCredentialsForm />
    </>
  );
}
