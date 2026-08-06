import type { Metadata } from "next";
import Link from "next/link";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthSplitLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to set a new one."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-act-red hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthSplitLayout>
  );
}
