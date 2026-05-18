"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Could not update password.");
        return;
      }

      setPassword("");
      setConfirm("");
      setMessage(data.message ?? "Your password has been updated.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-md">
      <CardHeader>
        <CardTitle className="font-heading text-2xl text-primary">Choose a new password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {!token ? (
            <Alert variant="destructive">
              <AlertDescription>Reset link is missing. Request a new password reset email.</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {message ? (
            <Alert>
              <AlertDescription>
                {message}{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </AlertDescription>
            </Alert>
          ) : null}
          <div>
            <Label htmlFor="new-password">New password</Label>
            <div className="relative mt-1.5">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                className="pr-10"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <div className="relative mt-1.5">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                className="pr-10"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm((value) => !value)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !token || Boolean(message)}>
            {loading ? "Updating..." : "Update password"}
          </Button>
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Request a new link
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

