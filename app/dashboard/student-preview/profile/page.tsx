import { UserProfileEditor } from "@/components/dashboard/user-profile-editor";
import { PREVIEW_SESSION_STUDENT } from "@/lib/dashboard/preview-sessions";

export default function StudentPreviewProfilePage() {
  return (
    <UserProfileEditor
      defaultName={PREVIEW_SESSION_STUDENT.name}
      defaultEmail={PREVIEW_SESSION_STUDENT.email}
      defaultPhone="(480) 555-0198"
      defaultCity="Phoenix"
    />
  );
}
