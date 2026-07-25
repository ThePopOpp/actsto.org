"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive, ArchiveRestore, Columns3, Download, LayoutGrid, List, Loader2, Mail, MessageSquare,
  Pencil, Phone, Plus, Search, Table as TableIcon, Trash2, Upload, X,
} from "lucide-react";

import { MediaUpload } from "@/components/dashboard/admin/blog/block-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTACT_STAGES, CONTACT_TYPES, contactName, stageColor, stageLabel, typeLabel, type ContactDTO,
} from "@/lib/contacts/constants";
import { cn } from "@/lib/utils";

type Stats = { total: number; users: number; nonUsers: number; archived: number; recent: number; stageCounts: Record<string, number> };
type ViewMode = "list" | "table" | "cards" | "kanban";
const NONE = "__none__";

const ASSIGNABLE_ROLES: { id: string; label: string }[] = [
  { id: "parent", label: "Parent / Guardian" },
  { id: "student", label: "Student" },
  { id: "donor_individual", label: "Individual Donor" },
  { id: "donor_business", label: "Business Donor" },
];
function roleLabel(role: string): string {
  return ASSIGNABLE_ROLES.find((r) => r.id === role)?.label ?? (role === "super_admin" ? "Super Admin" : role);
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}
function fmtPhone(v: string | null) {
  if (!v) return "";
  const d = v.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : v;
}

const EMPTY_FORM = {
  firstName: "", lastName: "", displayName: "", email: "", phone: "", company: "", jobTitle: "",
  contactType: "", stage: "new", city: "", state: "", source: "", notes: "", tags: "",
  avatarUrl: "", logoUrl: "",
};
type FormState = typeof EMPTY_FORM;

export function ContactsWorkspace() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactDTO[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("list");
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const [modal, setModal] = useState<{ mode: "view" | "edit" | "new"; contact: ContactDTO | null } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stageFilter) params.set("stage", stageFilter);
    if (typeFilter) params.set("type", typeFilter);
    params.set("status", statusFilter);
    const res = await fetch(`/api/admin/contacts?${params}`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { contacts?: ContactDTO[]; stats?: Stats } | null;
    if (res.ok && data) { setContacts(data.contacts ?? []); setStats(data.stats ?? null); }
    setLoading(false);
  }, [q, stageFilter, typeFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  function openNew() { setForm(EMPTY_FORM); setModal({ mode: "new", contact: null }); }
  function openView(c: ContactDTO) { setModal({ mode: "view", contact: c }); }
  function openEdit(c: ContactDTO) {
    setForm({
      firstName: c.firstName ?? "", lastName: c.lastName ?? "", displayName: c.displayName ?? "",
      email: c.email ?? "", phone: c.phone ?? "", company: c.company ?? "", jobTitle: c.jobTitle ?? "",
      contactType: c.contactType ?? "", stage: c.stage, city: c.city ?? "", state: c.state ?? "",
      source: c.source ?? "", notes: c.notes ?? "", tags: (c.tags ?? []).join(", "),
      avatarUrl: c.avatarUrl ?? "", logoUrl: c.logoUrl ?? "",
    });
    setModal({ mode: "edit", contact: c });
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...(modal?.contact ? { id: modal.contact.id } : {}),
      ...form,
      contactType: form.contactType || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    const res = await fetch("/api/admin/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) { setModal(null); await load(); }
  }

  async function patch(id: string, data: Record<string, unknown>) {
    await fetch(`/api/admin/contacts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    await load();
  }
  async function del(id: string) {
    if (!window.confirm("Delete this contact permanently?")) return;
    await fetch(`/api/admin/contacts/${id}`, { method: "DELETE" });
    setModal(null);
    await load();
  }
  async function importCsv(file: File) {
    const csv = await file.text();
    const res = await fetch("/api/admin/contacts/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv }) });
    const data = (await res.json().catch(() => null)) as { created?: number; updated?: number; skipped?: number; error?: string } | null;
    setImportResult(res.ok ? `Imported ${data?.created ?? 0} new, updated ${data?.updated ?? 0}, skipped ${data?.skipped ?? 0}.` : (data?.error ?? "Import failed."));
    await load();
  }

  async function assignRole(role: string, action: "add" | "remove") {
    if (!modal?.contact) return;
    const res = await fetch(`/api/admin/contacts/${modal.contact.id}/roles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, action }) });
    const data = (await res.json().catch(() => null)) as { contact?: ContactDTO; error?: string } | null;
    if (!res.ok) { window.alert(data?.error ?? "Could not update role."); return; }
    if (data?.contact) setModal({ mode: "view", contact: data.contact });
    await load();
  }

  function call(c: ContactDTO) { if (c.phone) router.push(`/dashboard/admin/dialer?to=${encodeURIComponent(c.phone)}`); void patch(c.id, { touchContacted: true }); }
  function sms(c: ContactDTO) { if (c.phone) router.push(`/dashboard/admin/sms?tab=send&to=${encodeURIComponent(c.phone)}`); void patch(c.id, { touchContacted: true }); }
  function email(c: ContactDTO) { if (c.email) window.location.href = `mailto:${c.email}`; void patch(c.id, { touchContacted: true }); }

  const statCards = useMemo(() => stats ? [
    { label: "Contacts", value: stats.total },
    { label: "Users", value: stats.users },
    { label: "Non-users", value: stats.nonUsers },
    { label: "New (30d)", value: stats.recent },
    { label: "Archived", value: stats.archived },
  ] : [], [stats]);

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/80"><CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold text-primary">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts…" className="pl-8" />
        </div>
        <Select value={stageFilter || NONE} onValueChange={(v) => setStageFilter(v === NONE ? "" : (v ?? ""))}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent><SelectItem value={NONE}>All stages</SelectItem>{CONTACT_STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={typeFilter || NONE} onValueChange={(v) => setTypeFilter(v === NONE ? "" : (v ?? ""))}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent><SelectItem value={NONE}>All types</SelectItem>{CONTACT_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "active")}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem><SelectItem value="all">All</SelectItem></SelectContent>
        </Select>
        <div className="flex rounded-lg border border-border p-0.5">
          {([["list", List], ["table", TableIcon], ["cards", LayoutGrid], ["kanban", Columns3]] as const).map(([v, Icon]) => (
            <button key={v} type="button" onClick={() => setView(v)} className={cn("rounded-md p-1.5", view === v ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")} aria-label={v}><Icon className="size-4" /></button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="mr-1.5 size-4" /> Import</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => window.open("/api/admin/contacts/export", "_blank")}><Download className="mr-1.5 size-4" /> Export</Button>
        <Button type="button" size="sm" onClick={openNew}><Plus className="mr-1.5 size-4" /> New</Button>
      </div>

      {importResult ? <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{importResult}</p> : null}

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No contacts. Add one or import a CSV.</p>
      ) : view === "kanban" ? (
        <KanbanView contacts={contacts} onOpen={openView} dragId={dragId} setDragId={setDragId} onStage={(id, stage) => void patch(id, { stage })} />
      ) : view === "table" ? (
        <TableView contacts={contacts} onOpen={openView} onCall={call} onSms={sms} onEmail={email} />
      ) : view === "cards" ? (
        <CardsView contacts={contacts} onOpen={openView} onCall={call} onSms={sms} onEmail={email} />
      ) : (
        <ListView contacts={contacts} onOpen={openView} onCall={call} onSms={sms} onEmail={email} />
      )}

      {modal ? (
        <ContactModal
          modal={modal} form={form} setForm={setForm} saving={saving}
          onClose={() => setModal(null)} onSave={save} onEdit={openEdit}
          onArchive={(c) => void patch(c.id, { status: c.status === "archived" ? "active" : "archived" }).then(() => setModal(null))}
          onDelete={(c) => void del(c.id)} onCall={call} onSms={sms} onEmail={email} onRole={assignRole}
        />
      ) : null}
    </div>
  );
}

function Avatar({ c }: { c: ContactDTO }) {
  const src = c.avatarUrl || c.logoUrl;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="size-9 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(contactName(c))}</span>
  );
}

function QuickActions({ c, onCall, onSms, onEmail }: { c: ContactDTO; onCall: (c: ContactDTO) => void; onSms: (c: ContactDTO) => void; onEmail: (c: ContactDTO) => void }) {
  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => onCall(c)} disabled={!c.phone} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="Call"><Phone className="size-4" /></button>
      <button type="button" onClick={() => onSms(c)} disabled={!c.phone} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="SMS"><MessageSquare className="size-4" /></button>
      <button type="button" onClick={() => onEmail(c)} disabled={!c.email} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="Email"><Mail className="size-4" /></button>
    </div>
  );
}

function StageChip({ stage }: { stage: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${stageColor(stage)}1a`, color: stageColor(stage) }}><span className="size-1.5 rounded-full" style={{ background: stageColor(stage) }} />{stageLabel(stage)}</span>;
}

function ListView({ contacts, onOpen, onCall, onSms, onEmail }: { contacts: ContactDTO[]; onOpen: (c: ContactDTO) => void; onCall: (c: ContactDTO) => void; onSms: (c: ContactDTO) => void; onEmail: (c: ContactDTO) => void }) {
  return (
    <Card className="border-border/80"><CardContent className="divide-y divide-border/60 p-0">
      {contacts.map((c) => (
        <button key={c.id} type="button" onClick={() => onOpen(c)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/20">
          <Avatar c={c} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><span className="truncate font-medium text-foreground">{contactName(c)}</span>{c.userId ? <Badge variant="secondary" className="text-[10px]">User</Badge> : null}{typeLabel(c.contactType) ? <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">{typeLabel(c.contactType)}</Badge> : null}</div>
            <p className="truncate text-xs text-muted-foreground">{[c.email, fmtPhone(c.phone)].filter(Boolean).join(" · ")}</p>
          </div>
          <StageChip stage={c.stage} />
          <QuickActions c={c} onCall={onCall} onSms={onSms} onEmail={onEmail} />
        </button>
      ))}
    </CardContent></Card>
  );
}

function TableView({ contacts, onOpen, onCall, onSms, onEmail }: { contacts: ContactDTO[]; onOpen: (c: ContactDTO) => void; onCall: (c: ContactDTO) => void; onSms: (c: ContactDTO) => void; onEmail: (c: ContactDTO) => void }) {
  return (
    <Card className="border-border/80"><CardContent className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
          <th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Type</th><th className="px-4 py-2 font-medium">Email</th><th className="px-4 py-2 font-medium">Phone</th><th className="px-4 py-2 font-medium">Stage</th><th className="px-4 py-2 font-medium">User</th><th className="px-4 py-2" />
        </tr></thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id} onClick={() => onOpen(c)} className="cursor-pointer border-b border-border/50 hover:bg-muted/20">
              <td className="px-4 py-2 font-medium text-foreground">{contactName(c)}</td>
              <td className="px-4 py-2 text-muted-foreground">{typeLabel(c.contactType) ?? "—"}</td>
              <td className="px-4 py-2 text-muted-foreground">{c.email ?? "—"}</td>
              <td className="px-4 py-2 text-muted-foreground">{fmtPhone(c.phone) || "—"}</td>
              <td className="px-4 py-2"><StageChip stage={c.stage} /></td>
              <td className="px-4 py-2">{c.userId ? <Badge variant="secondary" className="text-[10px]">Yes</Badge> : <span className="text-muted-foreground">—</span>}</td>
              <td className="px-4 py-2"><QuickActions c={c} onCall={onCall} onSms={onSms} onEmail={onEmail} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function CardsView({ contacts, onOpen, onCall, onSms, onEmail }: { contacts: ContactDTO[]; onOpen: (c: ContactDTO) => void; onCall: (c: ContactDTO) => void; onSms: (c: ContactDTO) => void; onEmail: (c: ContactDTO) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {contacts.map((c) => (
        <Card key={c.id} className="cursor-pointer border-border/80 transition-colors hover:border-primary/40" onClick={() => onOpen(c)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-3"><Avatar c={c} /><div className="min-w-0"><p className="truncate font-medium text-foreground">{contactName(c)}</p><p className="truncate text-xs text-muted-foreground">{typeLabel(c.contactType) ?? c.company ?? ""}</p></div></div>
            <p className="truncate text-xs text-muted-foreground">{[c.email, fmtPhone(c.phone)].filter(Boolean).join(" · ") || "No contact info"}</p>
            <div className="flex items-center justify-between"><StageChip stage={c.stage} /><QuickActions c={c} onCall={onCall} onSms={onSms} onEmail={onEmail} /></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ contacts, onOpen, dragId, setDragId, onStage }: { contacts: ContactDTO[]; onOpen: (c: ContactDTO) => void; dragId: string | null; setDragId: (id: string | null) => void; onStage: (id: string, stage: string) => void }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {CONTACT_STAGES.map((stage) => {
        const items = contacts.filter((c) => c.stage === stage.id);
        return (
          <div key={stage.id} className="w-72 shrink-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId) onStage(dragId, stage.id); setDragId(null); }}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><span className="size-2 rounded-full" style={{ background: stage.color }} />{stage.label}</span>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-2">
              {items.map((c) => (
                <div key={c.id} draggable onDragStart={() => setDragId(c.id)} onDragEnd={() => setDragId(null)} onClick={() => onOpen(c)} className="cursor-pointer rounded-lg border border-border/80 bg-card p-3 hover:border-primary/40">
                  <div className="flex items-center gap-2"><Avatar c={c} /><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{contactName(c)}</p><p className="truncate text-xs text-muted-foreground">{c.email ?? fmtPhone(c.phone) ?? ""}</p></div></div>
                </div>
              ))}
              {items.length === 0 ? <p className="px-2 py-4 text-center text-xs text-muted-foreground">Drop here</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContactModal({
  modal, form, setForm, saving, onClose, onSave, onEdit, onArchive, onDelete, onCall, onSms, onEmail, onRole,
}: {
  modal: { mode: "view" | "edit" | "new"; contact: ContactDTO | null };
  form: FormState; setForm: (f: FormState) => void; saving: boolean;
  onClose: () => void; onSave: () => void; onEdit: (c: ContactDTO) => void;
  onArchive: (c: ContactDTO) => void; onDelete: (c: ContactDTO) => void;
  onCall: (c: ContactDTO) => void; onSms: (c: ContactDTO) => void; onEmail: (c: ContactDTO) => void;
  onRole: (role: string, action: "add" | "remove") => Promise<void>;
}) {
  const c = modal.contact;
  const editing = modal.mode !== "view";
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const [addRole, setAddRole] = useState("");
  const [roleBusy, setRoleBusy] = useState(false);
  async function doRole(role: string, action: "add" | "remove") {
    setRoleBusy(true);
    try { await onRole(role, action); setAddRole(""); } finally { setRoleBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:pt-16" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <h2 className="font-heading text-lg font-semibold text-primary">{modal.mode === "new" ? "New contact" : modal.mode === "edit" ? "Edit contact" : contactName(c!)}</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="size-5 text-muted-foreground" /></button>
        </div>

        {editing ? (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Photo / image</Label>
                <div className="mt-1 flex items-center gap-2">
                  {form.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.avatarUrl} alt="" className="size-10 rounded-full border border-border object-cover" />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials([form.firstName, form.lastName].join(" ") || "?")}</span>
                  )}
                  <MediaUpload accept="image/*" label={form.avatarUrl ? "Replace" : "Upload"} onUploaded={(url) => setForm({ ...form, avatarUrl: url })} />
                  {form.avatarUrl ? <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setForm({ ...form, avatarUrl: "" })}>Remove</button> : null}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Logo (org / business)</Label>
                <div className="mt-1 flex items-center gap-2">
                  {form.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logoUrl} alt="" className="size-10 rounded border border-border object-contain" />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground">Logo</span>
                  )}
                  <MediaUpload accept="image/*" label={form.logoUrl ? "Replace" : "Upload"} onUploaded={(url) => setForm({ ...form, logoUrl: url })} />
                  {form.logoUrl ? <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setForm({ ...form, logoUrl: "" })}>Remove</button> : null}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">First name</Label><Input value={form.firstName} onChange={set("firstName")} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Last name</Label><Input value={form.lastName} onChange={set("lastName")} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">Email</Label><Input value={form.email} onChange={set("email")} type="email" className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={form.phone} onChange={set("phone")} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">Company</Label><Input value={form.company} onChange={set("company")} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Job title</Label><Input value={form.jobTitle} onChange={set("jobTitle")} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={form.contactType || NONE} onValueChange={(v) => setForm({ ...form, contactType: v === NONE ? "" : (v ?? "") })}><SelectTrigger className="mt-1 w-full"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value={NONE}>—</SelectItem>{CONTACT_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label className="text-xs text-muted-foreground">Stage</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v ?? "new" })}><SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger><SelectContent>{CONTACT_STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">City</Label><Input value={form.city} onChange={set("city")} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">State</Label><Input value={form.state} onChange={set("state")} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs text-muted-foreground">Tags (comma-separated)</Label><Input value={form.tags} onChange={set("tags")} className="mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Notes</Label><Textarea value={form.notes} onChange={set("notes")} className="mt-1 min-h-[80px]" /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button type="button" size="sm" onClick={onSave} disabled={saving}>{saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null} Save</Button>
            </div>
          </div>
        ) : c ? (
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <Avatar c={c} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><StageChip stage={c.stage} />{c.userId ? <Badge variant="secondary" className="text-[10px]">User</Badge> : null}{typeLabel(c.contactType) ? <Badge variant="outline" className="text-[10px]">{typeLabel(c.contactType)}</Badge> : null}</div>
                {c.jobTitle || c.company ? <p className="mt-1 text-sm text-muted-foreground">{[c.jobTitle, c.company].filter(Boolean).join(" · ")}</p> : null}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => onCall(c)} disabled={!c.phone}><Phone className="mr-1.5 size-4" /> Call</Button>
              <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => onSms(c)} disabled={!c.phone}><MessageSquare className="mr-1.5 size-4" /> SMS</Button>
              <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => onEmail(c)} disabled={!c.email}><Mail className="mr-1.5 size-4" /> Email</Button>
            </div>
            {/* Roles manager — assigning a role makes the contact a user */}
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Roles {c.userId ? "" : "· assigning a role creates a login"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {(c.roles ?? []).length ? (c.roles ?? []).map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {roleLabel(r)}
                    {r !== "super_admin" ? <button type="button" aria-label="Remove role" onClick={() => void doRole(r, "remove")} className="hover:text-destructive"><X className="size-3" /></button> : null}
                  </span>
                )) : <span className="text-xs text-muted-foreground">Not a user yet.</span>}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Select value={addRole || NONE} onValueChange={(v) => setAddRole(v === NONE ? "" : (v ?? ""))}>
                  <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Add a role…" /></SelectTrigger>
                  <SelectContent><SelectItem value={NONE}>Add a role…</SelectItem>{ASSIGNABLE_ROLES.filter((r) => !(c.roles ?? []).includes(r.id)).map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" size="sm" disabled={!addRole || roleBusy} onClick={() => void doRole(addRole, "add")}>{roleBusy ? <Loader2 className="size-4 animate-spin" /> : "Add"}</Button>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Email" value={c.email} />
              <Row label="Phone" value={fmtPhone(c.phone)} />
              <Row label="Location" value={[c.city, c.state].filter(Boolean).join(", ")} />
              <Row label="Tags" value={c.tags?.length ? c.tags.join(", ") : null} />
              <Row label="Source" value={c.source} />
              {c.notes ? <div><dt className="text-xs text-muted-foreground">Notes</dt><dd className="mt-0.5 whitespace-pre-wrap text-foreground">{c.notes}</dd></div> : null}
            </dl>
            <div className="flex justify-between border-t border-border/60 pt-3">
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => onEdit(c)}><Pencil className="mr-1.5 size-3.5" /> Edit</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onArchive(c)}>{c.status === "archived" ? <><ArchiveRestore className="mr-1.5 size-3.5" /> Restore</> : <><Archive className="mr-1.5 size-3.5" /> Archive</>}</Button>
              </div>
              <Button type="button" size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => onDelete(c)}><Trash2 className="mr-1.5 size-3.5" /> Delete</Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right text-foreground">{value}</dd></div>;
}
