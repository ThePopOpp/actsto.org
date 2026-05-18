import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-muted/40 px-4 py-16">
      <ResetPasswordForm token={token} />
    </div>
  );
}

