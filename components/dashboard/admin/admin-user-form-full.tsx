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
  onSave: (user: AdminUserSample, oldId: string | null) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [role, setRole] = useState<UserRole>(initial.role);
  const [status, setStatus] = useState<AdminUserSample["status"]>(initial.status);
  const [campaignsCount, setCampaignsCount] = useState(String(initial.campaignsCount));
  const [lastActive, setLastActive] = useState(initial.lastActive);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
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
    const count = Math.max(0, Math.floor(Number.parseFloat(campaignsCount) || 0));
    const user: AdminUserSample = {
      id: initial.id,
      name: name.trim() || "Unnamed user",
      email: email.trim(),
      role,
      status,
      lastActive: lastActive.trim() || "—",
      campaignsCount: count,
    };
    const oldId = mode === "edit" ? initial.id : null;
    onSave(user, oldId);
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
          <p className="mt-1 font-mono text-xs text-muted-foreground">{initial.id}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Back to directory
        </Button>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Profile</CardTitle>
            <CardDescription>Display name and login email. Email must be unique in this directory.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="au-name">Full name</Label>
              <Input id="au-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
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
              />
              {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Access</CardTitle>
            <CardDescription>Portal role and account status for admin review.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole((v as UserRole) ?? "parent")}>
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
              <Select value={status} onValueChange={(v) => setStatus((v as AdminUserSample["status"]) ?? "active")}>
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

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Activity (demo)</CardTitle>
            <CardDescription>Campaign count and last-active label until your analytics API is connected.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="au-campaigns">Campaigns count</Label>
              <Input
                id="au-campaigns"
                type="number"
                min={0}
                className="mt-1.5"
                value={campaignsCount}
                onChange={(e) => setCampaignsCount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="au-last">Last active (display)</Label>
              <Input
                id="au-last"
                className="mt-1.5"
                value={lastActive}
                onChange={(e) => setLastActive(e.target.value)}
                placeholder="e.g. 2 hours ago"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit">{mode === "create" ? "Create user" : "Save changes"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
