import { UserProfileEditor } from "@/components/dashboard/user-profile-editor";
import { PREVIEW_SESSION_PARENT } from "@/lib/dashboard/preview-sessions";

export default function ParentPreviewProfilePage() {
  return (
    <UserProfileEditor
      defaultName={PREVIEW_SESSION_PARENT.name}
      defaultEmail={PREVIEW_SESSION_PARENT.email}
      defaultPhone="(480) 352-7598"
      defaultCity="Phoenix"
    />
  );
}
