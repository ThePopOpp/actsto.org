"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [name, setName] = useState("");
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
          name: name || email.split("@")[0],
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
    <Card className="w-full max-w-md border-border/80 shadow-md">
      <CardHeader>
        <CardTitle className="font-heading text-2xl text-primary">Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" autoComplete="off">
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              className="mt-1.5"
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
            <Label htmlFor="name">Display name (optional)</Label>
            <Input
              id="name"
              className="mt-1.5"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name or organization"
            />
          </div>
          <div>
            <Label htmlFor="pw">Password</Label>
            <div className="relative mt-1.5">
              <Input
                id="pw"
                type={showPassword ? "text" : "password"}
                className="pr-10"
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/register" className="text-act-red hover:underline">
              Create an account
            </Link>
            {" · "}
            <Link href="/forgot-password" className="hover:underline">
              Forgot password
            </Link>
            {" · "}
            <Link href="/dashboard" className="hover:underline">
              Dashboard hub
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md p-8 text-center text-muted-foreground">Loading…</Card>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
