import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { DownloadAppButton } from "@/components/pwa/download-app-button";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-16">
      <LoginForm />
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs text-muted-foreground">Get the full app experience</p>
        <DownloadAppButton variant="outline" size="default" hideWhenInstalled />
      </div>
    </div>
  );
}
