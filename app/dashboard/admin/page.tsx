import { AdminSuperAdminHome } from "@/components/dashboard/admin-super-admin-home";

export const dynamic = "force-dynamic";

export default function AdminOverviewPage() {
  return <AdminSuperAdminHome basePath="/dashboard/admin" />;
}
