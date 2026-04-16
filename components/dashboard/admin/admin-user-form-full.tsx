"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminUserSample } from "@/lib/admin/mock-users";
import type { UserRole } from "@/lib/auth/types";
import { ROLE_LABEL } from "@/lib/auth/types";

const ROLES: UserRole[] = [
  "super_admin",
  "parent",
  "student",
  "donor_individual",
  "donor_business",
];

export function AdminUserFormFull({
  mode,
  initial,
  existingEmails,
  onSave,
  onCancel,
}: {
  mode: "create" | "edit";
  initial: AdminUserSample;
  /** Lowercase emails already taken (exclude current user when editing). */
  existingEmails: string[];
  onSave: (
    user: AdminUserSample,
    oldId: string | null,
    secrets?: { password?: string; newPassword?: string }
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [role, setRole] = useState<UserRole>(initial.role);
  const [status, setStatus] = useState<AdminUserSample["status"]>(initial.status);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const emailLc = email.trim().toLowerCase();
    if (!emailLc || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLc)) {
      setError("Enter a valid email address.");
      return;
    }
    if (existingEmails.includes(emailLc)) {
      setError("That email is already assigned to another user.");
      return;
    }

    if (mode === "create") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== passwordConfirm) {
        setError("Passwords do not match.");
        return;
      }
    } else {
      if (newPassword || newPasswordConfirm) {
        if (newPassword.length < 8) {
          setError("New password must be at least 8 characters.");
          return;
        }
        if (newPassword !== newPasswordConfirm) {
          setError("New passwords do not match.");
          return;
        }
      }
    }

    const user: AdminUserSample = {
      id: initial.id,
      name: name.trim() || "Unnamed user",
      email: email.trim(),
      role,
      status,
      lastActive: initial.lastActive,
      campaignsCount: initial.campaignsCount,
    };
    const oldId = mode === "edit" ? initial.id : null;
    const secrets =
      mode === "create"
        ? { password }
        : newPassword
          ? { newPassword }
          : undefined;

    setError(null);
    setSaving(true);
    try {
      await onSave(user, oldId, secrets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {mode === "create" ? "Create user" : "Edit user"}
          </p>
          <h1 className="font-heading text-2xl font-semibold text-primary">
            {name.trim() || (mode === "create" ? "New user" : "User")}
          </h1>
          {mode === "edit" ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">{initial.id}</p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Back to directory
        </Button>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Profile</CardTitle>
            <CardDescription>Display name and login email. Email must be unique.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="au-name">Full name</Label>
              <Input
                id="au-name"
                className="mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="au-email">Email</Label>
              <Input
                id="au-email"
                type="email"
                className="mt-1.5"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                autoComplete="off"
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Access</CardTitle>
            <CardDescription>Portal role and account status.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole((v as UserRole) ?? "parent")}
                disabled={saving}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus((v as AdminUserSample["status"]) ?? "active")}
                disabled={saving}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {mode === "create" ? (
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Password</CardTitle>
              <CardDescription>Set an initial password for this account (minimum 8 characters).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="au-pw">Password</Label>
                <Input
                  id="au-pw"
                  type="password"
                  className="mt-1.5"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="au-pw2">Confirm password</Label>
                <Input
                  id="au-pw2"
                  type="password"
                  className="mt-1.5"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Password</CardTitle>
              <CardDescription>Leave blank to keep the current password. Minimum 8 characters.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="au-npw">New password</Label>
                <Input
                  id="au-npw"
                  type="password"
                  className="mt-1.5"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="au-npw2">Confirm new password</Label>
                <Input
                  id="au-npw2"
                  type="password"
                  className="mt-1.5"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Activity</CardTitle>
            <CardDescription>
              Campaigns count is derived from campaign directory rows where the parent email matches. Last active updates
              when the user signs in.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Campaigns</Label>
              <p className="mt-1.5 text-sm tabular-nums text-foreground">{initial.campaignsCount}</p>
            </div>
            <div>
              <Label>Last active</Label>
              <p className="mt-1.5 text-sm text-muted-foreground">{initial.lastActive}</p>
            </div>
          </CardContent>
        </Card>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create user" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
