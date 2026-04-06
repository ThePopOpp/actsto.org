import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-muted/40 px-4 py-16">
      <LoginForm />
    </div>
  );
}
