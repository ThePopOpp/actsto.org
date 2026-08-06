"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { DownloadAppButton } from "@/components/pwa/download-app-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/lib/auth/types";

const ROLES: UserRole[] = [
  "donor_individual",
  "donor_business",
  "parent",
  "student",
  "super_admin",
];

function LoginFormInner() {
  const sp = useSearchParams();
  const nextFromUrl = sp.get("next") ?? "";
  const roleParam = sp.get("role") as UserRole | null;
  const requestedRole = roleParam && ROLES.includes(roleParam) ? roleParam : undefined;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: email.split("@")[0],
          password,
          role: requestedRole,
          next: nextFromUrl || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; redirect?: string };
      if (!res.ok) {
        setError(data.error ?? "Sign in failed.");
        return;
      }
      window.location.href = data.redirect ?? "/dashboard";
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5" autoComplete="off">
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          className="mt-1.5 h-11"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        {/* Reset sits beside the label, where someone who can't remember their
            password is already looking. */}
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="pw">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-act-red hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
        <div className="relative mt-1.5">
          <Input
            id="pw"
            type={showPassword ? "text" : "password"}
            className="h-11 pr-10"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
      </div>

      <Button type="submit" className="h-11 w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <DownloadAppButton
        label="Get the ACTSTO app"
        variant="outline"
        size="default"
        className="h-11 w-full"
      />

      <p className="text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link href="/register" className="font-medium text-act-red hover:underline">
          Create one
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        Parents, students, and donors all sign in here.
      </p>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={<div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>}
    >
      <LoginFormInner />
    </Suspense>
  );
}
