import type { Metadata } from "next";
import Link from "next/link";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <AuthSplitLayout
      title="Choose a new password"
      subtitle="Pick something you don't use anywhere else."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-act-red hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthSplitLayout>
  );
}
