"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Power, Trash2, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AUTOMATION_CONDITION_ROLES, AUTOMATION_EVENTS, automationEventDef } from "@/lib/automations/events";
import { cn } from "@/lib/utils";

type Opt = { id: string; title: string };
type StepForm = { channel: "email" | "sms"; emailTemplateId: string; smsTemplateId: string; subjectOverride: string; delayValue: string; delayUnit: "minutes" | "hours" | "days" };
type Automation = {
  id: string; name: string; description: string | null; triggerEvent: string; enabled: boolean;
  conditions: { roles?: string[]; minAmount?: number; campaignId?: string };
  steps: { channel: string; emailTemplateId: string | null; smsTemplateId: string | null; subjectOverride: string | null; delayMinutes: number }[];
  updatedAt: string;
};
type Job = { id: string; automation: string; channel: string; triggerEvent: string; recipient: string; status: string; scheduledFor: string; sentAt: string | null; error: string | null };

function unitFactor(u: StepForm["delayUnit"]) { return u === "days" ? 1440 : u === "hours" ? 60 : 1; }
function minutesToUnit(m: number): { value: string; unit: StepForm["delayUnit"] } {
  if (m && m % 1440 === 0) return { value: String(m / 1440), unit: "days" };
  if (m && m % 60 === 0) return { value: String(m / 60), unit: "hours" };
  return { value: String(m), unit: "minutes" };
}
function eventLabel(id: string) { return automationEventDef(id)?.label ?? id; }
function dt(v: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(v)); }
const emptyStep = (): StepForm => ({ channel: "email", emailTemplateId: "", smsTemplateId: "", subjectOverride: "", delayValue: "0", delayUnit: "minutes" });

export function EmailAutomationsPanel() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<Opt[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<Opt[]>([]);
  const [campaigns, setCampaigns] = useState<Opt[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobStats, setJobStats] = useState({ pending: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"list" | "edit">("list");

  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("donation_paid");
  const [enabled, setEnabled] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [steps, setSteps] = useState<StepForm[]>([emptyStep()]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [aRes, jRes] = await Promise.all([
      fetch("/api/admin/automations", { cache: "no-store" }),
      fetch("/api/admin/automations/jobs", { cache: "no-store" }),
    ]);
    const a = (await aRes.json().catch(() => null)) as { automations?: Automation[]; emailTemplates?: Opt[]; smsTemplates?: Opt[]; campaigns?: Opt[] } | null;
    const j = (await jRes.json().catch(() => null)) as { jobs?: Job[]; pending?: number; failed?: number } | null;
    if (aRes.ok && a) { setAutomations(a.automations ?? []); setEmailTemplates(a.emailTemplates ?? []); setSmsTemplates(a.smsTemplates ?? []); setCampaigns(a.campaigns ?? []); }
    if (jRes.ok && j) { setJobs(j.jobs ?? []); setJobStats({ pending: j.pending ?? 0, failed: j.failed ?? 0 }); }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function newAutomation() {
    setEditId(null); setName(""); setDescription(""); setTriggerEvent("donation_paid"); setEnabled(true);
    setRoles([]); setMinAmount(""); setCampaignId(""); setSteps([emptyStep()]); setMode("edit");
  }
  function edit(a: Automation) {
    setEditId(a.id); setName(a.name); setDescription(a.description ?? ""); setTriggerEvent(a.triggerEvent); setEnabled(a.enabled);
    setRoles(a.conditions.roles ?? []); setMinAmount(a.conditions.minAmount ? String(a.conditions.minAmount) : ""); setCampaignId(a.conditions.campaignId ?? "");
    setSteps(a.steps.length ? a.steps.map((s) => { const d = minutesToUnit(s.delayMinutes); return { channel: s.channel === "sms" ? "sms" : "email", emailTemplateId: s.emailTemplateId ?? "", smsTemplateId: s.smsTemplateId ?? "", subjectOverride: s.subjectOverride ?? "", delayValue: d.value, delayUnit: d.unit }; }) : [emptyStep()]);
    setMode("edit");
  }
  async function toggleEnabled(a: Automation) {
    await fetch(`/api/admin/automations/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !a.enabled }) });
    await load();
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this automation?")) return;
    await fetch(`/api/admin/automations/${id}`, { method: "DELETE" });
    await load();
  }
  function updateStep(i: number, patch: Partial<StepForm>) { setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s))); }
  function moveStep(i: number, dir: -1 | 1) { setSteps((prev) => { const j = i + dir; if (j < 0 || j >= prev.length) return prev; const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n; }); }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const conditions: Automation["conditions"] = {};
    if (roles.length) conditions.roles = roles;
    if (minAmount && Number(minAmount) > 0) conditions.minAmount = Number(minAmount);
    if (campaignId) conditions.campaignId = campaignId;
    const payload = {
      name, description, triggerEvent, enabled, conditions,
      steps: steps.map((s) => ({ channel: s.channel, emailTemplateId: s.channel === "email" ? s.emailTemplateId || null : null, smsTemplateId: s.channel === "sms" ? s.smsTemplateId || null : null, subjectOverride: s.subjectOverride || null, delayMinutes: (Number(s.delayValue) || 0) * unitFactor(s.delayUnit) })),
    };
    const res = editId
      ? await fetch(`/api/admin/automations/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/admin/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) { setMode("list"); await load(); }
  }

  const fields = automationEventDef(triggerEvent)?.fields ?? [];

  if (mode === "edit") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode("list")}>← Automations</Button>
          <Button type="button" size="sm" onClick={() => void save()} disabled={saving || !name.trim()}>{saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null} Save automation</Button>
        </div>

        <Card className="border-border/80"><CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <div><Label className="text-xs text-muted-foreground">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="Donation thank-you + receipt" /></div>
          <div><Label className="text-xs text-muted-foreground">Trigger event</Label>
            <Select value={triggerEvent} onValueChange={(v) => setTriggerEvent(v ?? "donation_paid")}><SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger><SelectContent>{AUTOMATION_EVENTS.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="sm:col-span-2"><Label className="text-xs text-muted-foreground">Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" /></div>
          <div className="sm:col-span-2 flex flex-wrap gap-1.5">
            <span className="text-[11px] text-muted-foreground">Merge fields:</span>
            {fields.map((f) => <code key={f} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{`{{${f}}}`}</code>)}
          </div>
        </CardContent></Card>

        {/* Conditions */}
        <Card className="border-border/80"><CardContent className="space-y-3 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Conditions (optional)</p>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Only these roles</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {AUTOMATION_CONDITION_ROLES.map((r) => (
                  <button key={r.id} type="button" onClick={() => setRoles((prev) => prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id])} className={cn("rounded-full border px-2.5 py-1 text-xs", roles.includes(r.id) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{r.label}</button>
                ))}
              </div>
            </div>
            <div><Label className="text-xs text-muted-foreground">Min amount ($)</Label><Input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} type="number" className="mt-1 w-28" placeholder="Any" /></div>
            <div className="w-52"><Label className="text-xs text-muted-foreground">Campaign</Label>
              <Select value={campaignId || "any"} onValueChange={(v) => setCampaignId(v === "any" ? "" : (v ?? ""))}><SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Any campaign" /></SelectTrigger><SelectContent><SelectItem value="any">Any campaign</SelectItem>{campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
        </CardContent></Card>

        {/* Steps */}
        <Card className="border-border/80"><CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Steps</p><Button type="button" size="sm" variant="outline" onClick={() => setSteps((prev) => [...prev, emptyStep()])}><Plus className="mr-1.5 size-3.5" /> Add step</Button></div>
          {steps.map((s, i) => (
            <div key={i} className="rounded-lg border border-border/80 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Step {i + 1}</span>
                <div className="flex gap-0.5">
                  <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
                  <button type="button" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
                  <button type="button" onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div><Label className="text-xs text-muted-foreground">Channel</Label>
                  <Select value={s.channel} onValueChange={(v) => updateStep(i, { channel: v === "sms" ? "sms" : "email" })}><SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem></SelectContent></Select>
                </div>
                <div><Label className="text-xs text-muted-foreground">{s.channel === "sms" ? "SMS template" : "Email template"}</Label>
                  {s.channel === "sms" ? (
                    <Select value={s.smsTemplateId || "none"} onValueChange={(v) => updateStep(i, { smsTemplateId: v === "none" ? "" : (v ?? "") })}><SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Choose…" /></SelectTrigger><SelectContent><SelectItem value="none">Choose…</SelectItem>{smsTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent></Select>
                  ) : (
                    <Select value={s.emailTemplateId || "none"} onValueChange={(v) => updateStep(i, { emailTemplateId: v === "none" ? "" : (v ?? "") })}><SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Choose…" /></SelectTrigger><SelectContent><SelectItem value="none">Choose…</SelectItem>{emailTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent></Select>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1"><Label className="text-xs text-muted-foreground">Delay</Label><Input value={s.delayValue} onChange={(e) => updateStep(i, { delayValue: e.target.value })} type="number" className="mt-1" /></div>
                  <Select value={s.delayUnit} onValueChange={(v) => updateStep(i, { delayUnit: (v as StepForm["delayUnit"]) ?? "minutes" })}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minutes">minutes</SelectItem><SelectItem value="hours">hours</SelectItem><SelectItem value="days">days</SelectItem></SelectContent></Select>
                </div>
                {s.channel === "email" ? <div><Label className="text-xs text-muted-foreground">Subject override (optional)</Label><Input value={s.subjectOverride} onChange={(e) => updateStep(i, { subjectOverride: e.target.value })} className="mt-1" /></div> : null}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{i === 0 && s.delayValue === "0" ? "Sends immediately when the event fires." : `Sends ${s.delayValue} ${s.delayUnit} after the event.`}</p>
            </div>
          ))}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Trigger an email/SMS sequence when something happens (e.g. donation paid → thank-you now, receipt in 5 days).</p>
        <Button type="button" size="sm" onClick={newAutomation}><Plus className="mr-1.5 size-4" /> New automation</Button>
      </div>

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : automations.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-muted-foreground"><Zap className="mx-auto mb-2 size-6 opacity-50" />No automations yet. Create one to start sending on triggers.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {automations.map((a) => (
            <Card key={a.id} className="border-border/80"><CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="truncate font-medium text-foreground">{a.name}</span><Badge variant="outline" className="text-[10px]">{eventLabel(a.triggerEvent)}</Badge>{a.enabled ? <Badge className="bg-emerald-600 text-[10px] hover:bg-emerald-600">On</Badge> : <Badge variant="secondary" className="text-[10px]">Off</Badge>}</div>
                <p className="text-xs text-muted-foreground">{a.steps.length} step{a.steps.length === 1 ? "" : "s"}{a.description ? ` · ${a.description}` : ""}</p>
              </div>
              <button type="button" onClick={() => void toggleEnabled(a)} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title={a.enabled ? "Disable" : "Enable"}><Power className={cn("size-4", a.enabled && "text-emerald-600")} /></button>
              <Button type="button" size="sm" variant="outline" onClick={() => edit(a)}>Edit</Button>
              <Button type="button" size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => void remove(a.id)}><Trash2 className="size-3.5" /></Button>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Run log */}
      <Card className="border-border/80"><CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Run log</p>
          <span className="text-xs text-muted-foreground">{jobStats.pending} pending · {jobStats.failed} failed</span>
        </div>
        {jobs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No automation jobs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground"><th className="px-3 py-2 font-medium">Automation</th><th className="px-3 py-2 font-medium">Recipient</th><th className="px-3 py-2 font-medium">Channel</th><th className="px-3 py-2 font-medium">Scheduled</th><th className="px-3 py-2 font-medium">Status</th></tr></thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-border/50">
                    <td className="px-3 py-2 text-foreground">{j.automation}</td>
                    <td className="px-3 py-2 text-muted-foreground">{j.recipient}</td>
                    <td className="px-3 py-2 uppercase text-muted-foreground">{j.channel}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{dt(j.scheduledFor)}</td>
                    <td className="px-3 py-2"><Badge variant={j.status === "sent" ? "secondary" : j.status === "failed" ? "destructive" : "outline"} className={cn("text-[10px]", j.status === "sent" && "text-emerald-600")}>{j.status}</Badge>{j.error ? <span className="ml-1 text-[10px] text-destructive" title={j.error}>!</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
