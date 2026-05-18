import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-muted/40 px-4 py-16">
      <ForgotPasswordForm />
    </div>
  );
}
