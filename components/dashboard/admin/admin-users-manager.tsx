"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { AdminUserFormFull } from "@/components/dashboard/admin/admin-user-form-full";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminUserSample } from "@/lib/admin/mock-users";
import { ROLE_LABEL } from "@/lib/auth/types";

function newUserId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyUser(): AdminUserSample {
  return {
    id: newUserId(),
    name: "",
    email: "",
    role: "parent",
    status: "invited",
    lastActive: "—",
    campaignsCount: 0,
  };
}

function initials(name: string) {
  const p = name.split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return `${p[0]![0] ?? ""}${p[p.length - 1]![0] ?? ""}`.toUpperCase();
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100] as const;

function matchesUserSearch(u: AdminUserSample, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  const haystack = [
    u.name,
    u.email,
    u.id,
    ROLE_LABEL[u.role],
    u.status,
    String(u.campaignsCount),
    u.lastActive,
  ]
    .join(" ")
    .toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

function statusBadge(status: AdminUserSample["status"]) {
  switch (status) {
    case "active":
      return <Badge variant="secondary">Active</Badge>;
    case "invited":
      return <Badge variant="outline">Invited</Badge>;
    case "suspended":
      return <Badge variant="destructive">Suspended</Badge>;
    default:
      return null;
  }
}

export function AdminUsersManager() {
  const [rows, setRows] = useState<AdminUserSample[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");
  const [screen, setScreen] = useState<"table" | "editor">("table");
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftUser, setDraftUser] = useState<AdminUserSample | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page, setPage] = useState(1);

  const loadUsers = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = (await res.json().catch(() => null)) as { users?: AdminUserSample[]; error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to load users.");
      }
      setRows(Array.isArray(data?.users) ? data.users : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load users.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredRows = useMemo(
    () => (rows ? rows.filter((u) => matchesUserSearch(u, searchQuery)) : []),
    [rows, searchQuery]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageOffset = (safePage - 1) * pageSize;
  const pageRows = filteredRows.slice(pageOffset, pageOffset + pageSize);
  const rangeStart = filteredRows.length === 0 ? 0 : pageOffset + 1;
  const rangeEnd = Math.min(pageOffset + pageSize, filteredRows.length);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  const reservedEmails = useMemo(() => {
    if (!rows) return [];
    return rows
      .filter((r) => r.id !== (editingId ?? ""))
      .map((r) => r.email.trim().toLowerCase())
      .filter(Boolean);
  }, [rows, editingId]);

  function handleCreateClick() {
    setEditorMode("create");
    setEditingId(null);
    setDraftUser(emptyUser());
    setScreen("editor");
  }

  function handleEditClick(id: string) {
    const u = rows?.find((r) => r.id === id);
    if (!u) return;
    setEditorMode("edit");
    setEditingId(id);
    setDraftUser({ ...u });
    setScreen("editor");
  }

  async function handleSaveFromForm(
    user: AdminUserSample,
    oldId: string | null,
    secrets?: { password?: string; newPassword?: string }
  ) {
    if (editorMode === "create") {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          password: secrets?.password,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to create user.");
      }
    } else {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          ...(secrets?.newPassword ? { newPassword: secrets.newPassword } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to update user.");
      }
    }
    await loadUsers();
    setScreen("table");
    setEditingId(null);
    setDraftUser(null);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/users/${deleteId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to delete user.");
      }
      await loadUsers();
      setDeleteId(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  const deleteName = deleteId && rows ? rows.find((r) => r.id === deleteId)?.name : null;

  if (!rows) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading users…
      </p>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-destructive">{loadError}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void loadUsers()}>
          Retry
        </Button>
      </div>
    );
  }

  if (screen === "editor" && draftUser) {
    return (
      <AdminUserFormFull
        mode={editorMode}
        initial={draftUser}
        existingEmails={reservedEmails}
        onSave={handleSaveFromForm}
        onCancel={() => {
          setScreen("table");
          setEditingId(null);
          setDraftUser(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} total
          {searchQuery.trim() ? (
            <>
              {" "}
              · {filteredRows.length} match{filteredRows.length === 1 ? "" : "es"}
            </>
          ) : null}{" "}
          · Create, edit, or delete accounts stored in the database. Super Admin sign-in still requires{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">ADMIN_EMAILS</code> (or temp bootstrap credentials)
          for that role.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" className="gap-1.5" onClick={handleCreateClick}>
            <Plus className="size-4" aria-hidden />
            Add user
          </Button>
          <div className="flex w-fit rounded-lg border border-border bg-muted/30 p-0.5">
            <Button
              type="button"
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 rounded-md px-3"
              onClick={() => setView("list")}
            >
              <List className="size-4" />
              List
            </Button>
            <Button
              type="button"
              variant={view === "grid" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 rounded-md px-3"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="size-4" />
              Grid
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-md">
          <Label htmlFor="admin-users-search" className="sr-only">
            Search users
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="admin-users-search"
              type="search"
              placeholder="Search by name, email, ID, role, or status…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="admin-users-page-size" className="whitespace-nowrap text-sm text-muted-foreground">
              Per page
            </Label>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v) as (typeof PAGE_SIZE_OPTIONS)[number])}
            >
              <SelectTrigger id="admin-users-page-size" className="w-[88px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <Card className="overflow-hidden border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Campaigns</th>
                  <th className="px-4 py-3">Last active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {searchQuery.trim()
                        ? "No users match your search. Try different words or clear the filter."
                        : "No users in this directory."}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((u) => (
                  <tr key={u.id} className="border-b border-border/80 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {initials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="truncate text-muted-foreground">{u.email}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{ROLE_LABEL[u.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">{statusBadge(u.status)}</td>
                    <td className="px-4 py-3 tabular-nums">{u.campaignsCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.lastActive}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 px-2"
                          onClick={() => handleEditClick(u.id)}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 px-2 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(u.id)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pageRows.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
              {searchQuery.trim()
                ? "No users match your search. Try different words or clear the filter."
                : "No users in this directory."}
            </div>
          ) : (
            pageRows.map((u) => (
            <Card key={u.id} className="border-border/80 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {initials(u.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading font-semibold text-primary">{u.name}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{u.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{ROLE_LABEL[u.role]}</Badge>
                      {statusBadge(u.status)}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{u.campaignsCount}</span> campaigns · Last active{" "}
                      {u.lastActive}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => handleEditClick(u.id)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteId(u.id)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>
      )}

      <div
        className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
        role="navigation"
        aria-label="User list pagination"
      >
        <p className="text-sm text-muted-foreground">
          {filteredRows.length === 0 ? (
            "No users to show."
          ) : (
            <>
              Showing <span className="font-medium text-foreground">{rangeStart}</span>–
              <span className="font-medium text-foreground">{rangeEnd}</span> of{" "}
              <span className="font-medium text-foreground">{filteredRows.length}</span>
              {searchQuery.trim() ? ` (of ${rows.length} total)` : ""}
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{safePage}</span> of{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" aria-hidden />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        FluentCRM segments and automated password reset emails can plug in when you add those services.
      </p>

      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              Permanently remove <strong className="text-foreground">{deleteName ?? deleteId}</strong> from the database.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
