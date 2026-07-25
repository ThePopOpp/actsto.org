import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { SocialComposer } from "@/components/dashboard/admin/social/social-composer";

export const dynamic = "force-dynamic";

export default function AdminSocialPage() {
  return (
    <>
      <AdminPageHeader title="Social" description="Compose social posts with the block builder, sized per platform and medium." />
      <SocialComposer />
    </>
  );
}
