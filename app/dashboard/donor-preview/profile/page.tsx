import { UserProfileEditor } from "@/components/dashboard/user-profile-editor";
import { PREVIEW_SESSION_DONOR } from "@/lib/dashboard/preview-sessions";

export default function DonorPreviewProfilePage() {
  return (
    <UserProfileEditor
      defaultName={PREVIEW_SESSION_DONOR.name}
      defaultEmail={PREVIEW_SESSION_DONOR.email}
      defaultPhone="(602) 555-0144"
      defaultCity="Scottsdale"
    />
  );
}
