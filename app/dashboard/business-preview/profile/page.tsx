import { UserProfileEditor } from "@/components/dashboard/user-profile-editor";
import { PREVIEW_SESSION_BUSINESS } from "@/lib/dashboard/preview-sessions";

export default function BusinessPreviewProfilePage() {
  return (
    <UserProfileEditor
      defaultName={PREVIEW_SESSION_BUSINESS.name}
      defaultEmail={PREVIEW_SESSION_BUSINESS.email}
      defaultPhone="(602) 421-8301"
      defaultAddress="2200 E Camelback Rd"
      defaultCity="Phoenix"
      defaultZip="85016"
    />
  );
}
