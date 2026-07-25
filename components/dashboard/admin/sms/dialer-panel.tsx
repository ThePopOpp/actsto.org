"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Call, Device } from "@twilio/voice-sdk";
import {
  ChevronDown,
  Delete,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  PhoneOutgoing,
  RefreshCw,
  Voicemail,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CallRow = {
  id: string;
  contactName: string | null;
  direction: string;
  fromPhone: string | null;
  toPhone: string;
  callerId: string | null;
  status: string | null;
  durationSeconds: number | null;
  recordingUrl: string | null;
  recordingDurationSeconds: number | null;
  isVoicemail: boolean;
  notes: string | null;
  campaignTitle: string | null;
  createdAt: string;
};

const KEYS: [string, string][] = [
  ["1", ""], ["2", "ABC"], ["3", "DEF"],
  ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
  ["*", ""], ["0", "+"], ["#", ""],
];

function normNum(v: string): string {
  const t = v.trim();
  if (t.startsWith("+")) return `+${t.slice(1).replace(/\D/g, "")}`;
  const d = t.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return d ? `+${d}` : "";
}
function fmtPhone(v: string | null): string {
  if (!v) return "Unknown";
  const d = v.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (ten.length === 10) return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
  return v;
}
function dur(s: number | null): string {
  if (!s && s !== 0) return "";
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
function dt(v: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(v));
}
function dtFull(v: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(v));
}

export function DialerPanel() {
  const router = useRouter();
  const deviceRef = useRef<Device | null>(null);
  const activeCallRef = useRef<Call | null>(null);

  const [status, setStatus] = useState<"connecting" | "ready" | "offline" | "error">("connecting");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [callerIds, setCallerIds] = useState<string[]>([]);
  const [callerId, setCallerId] = useState("");

  const [number, setNumber] = useState("");
  const [callState, setCallState] = useState<"idle" | "connecting" | "ringing" | "open">("idle");
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [incoming, setIncoming] = useState<Call | null>(null);
  const [incomingFrom, setIncomingFrom] = useState<string>("");

  const [calls, setCalls] = useState<CallRow[]>([]);
  const [view, setView] = useState<"history" | "voicemail">("history");
  const [filter, setFilter] = useState<"all" | "inbound" | "outbound">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const loadCalls = useCallback(async () => {
    const res = await fetch("/api/admin/dialer/calls", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as
      | { voice?: { ready: boolean; callerIds: string[] }; calls?: CallRow[] }
      | null;
    if (res.ok && data) setCalls(data.calls ?? []);
  }, []);

  const fetchToken = useCallback(async (): Promise<string | null> => {
    const res = await fetch("/api/voice/token", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as
      | { token?: string; callerIds?: string[]; defaultCallerId?: string; error?: string }
      | null;
    if (!res.ok || !data?.token) {
      setStatus("error");
      setStatusMsg(data?.error ?? "Could not authorize voice calling.");
      return null;
    }
    setCallerIds(data.callerIds ?? []);
    setCallerId((prev) => prev || data.defaultCallerId || data.callerIds?.[0] || "");
    return data.token;
  }, []);

  const wireCall = useCallback((call: Call) => {
    activeCallRef.current = call;
    call.on("accept", () => setCallState("open"));
    call.on("ringing", () => setCallState("ringing"));
    const end = () => {
      setCallState("idle");
      setMuted(false);
      setSeconds(0);
      activeCallRef.current = null;
      void loadCalls();
    };
    call.on("disconnect", end);
    call.on("cancel", end);
    call.on("reject", end);
    call.on("error", end);
  }, [loadCalls]);

  // Boot the Twilio Device (browser-only; dynamically imported to avoid SSR).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await fetchToken();
      if (!token || cancelled) return;
      const { Device } = await import("@twilio/voice-sdk");
      if (cancelled) return;
      const device = new Device(token, { codecPreferences: ["opus", "pcmu"] as never, logLevel: "error" as never });
      deviceRef.current = device;
      device.on("registered", () => setStatus("ready"));
      device.on("unregistered", () => setStatus("offline"));
      device.on("error", (err: { message?: string }) => { setStatus("error"); setStatusMsg(err?.message ?? "Voice device error."); });
      device.on("incoming", (call: Call) => {
        setIncoming(call);
        setIncomingFrom(call.parameters?.From ?? "");
        call.on("cancel", () => setIncoming(null));
        call.on("disconnect", () => { setIncoming(null); void loadCalls(); });
      });
      device.on("tokenWillExpire", async () => {
        const fresh = await fetchToken();
        if (fresh) device.updateToken(fresh);
      });
      try {
        await device.register();
      } catch {
        setStatus("error");
        setStatusMsg("Microphone permission or registration failed.");
      }
    })();
    void loadCalls();
    return () => {
      cancelled = true;
      deviceRef.current?.destroy();
      deviceRef.current = null;
    };
  }, [fetchToken, loadCalls]);

  // Call duration ticker.
  useEffect(() => {
    if (callState !== "open") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  async function startCall() {
    const device = deviceRef.current;
    const to = normNum(number);
    if (!device || !to) return;
    setCallState("connecting");
    try {
      const call = await device.connect({ params: { To: to, CallerId: callerId } });
      wireCall(call);
    } catch {
      setCallState("idle");
      setStatusMsg("Could not place the call.");
    }
  }

  function hangup() {
    activeCallRef.current?.disconnect();
    deviceRef.current?.disconnectAll();
  }
  function toggleMute() {
    const call = activeCallRef.current;
    if (!call) return;
    const next = !muted;
    call.mute(next);
    setMuted(next);
  }
  function pressKey(k: string) {
    if (callState === "open" && activeCallRef.current) {
      activeCallRef.current.sendDigits(k);
      return;
    }
    setNumber((n) => n + k);
  }
  function acceptIncoming() {
    if (!incoming) return;
    incoming.accept();
    wireCall(incoming);
    setCallState("open");
    setIncoming(null);
  }
  function rejectIncoming() {
    incoming?.reject();
    setIncoming(null);
  }

  async function saveNote(id: string) {
    const notes = noteDraft[id] ?? "";
    await fetch(`/api/admin/dialer/calls/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    await loadCalls();
  }
  function callBack(row: CallRow) {
    const n = row.direction === "inbound" ? row.fromPhone : row.toPhone;
    if (n) setNumber(n);
  }
  function textContact(row: CallRow) {
    const n = row.direction === "inbound" ? row.fromPhone : row.toPhone;
    router.push(`/dashboard/admin/sms?tab=send${n ? `&to=${encodeURIComponent(n)}` : ""}`);
  }

  const inCall = callState !== "idle";
  const voicemails = useMemo(() => calls.filter((c) => c.isVoicemail), [calls]);
  const historyRows = useMemo(() => {
    const base = view === "voicemail" ? voicemails : calls;
    return base.filter((c) => (filter === "all" ? true : c.direction === filter));
  }, [calls, voicemails, view, filter]);

  const statusPill =
    status === "ready" ? { label: "Ready", tone: "text-emerald-600" }
      : status === "connecting" ? { label: "Connecting…", tone: "text-muted-foreground" }
        : status === "offline" ? { label: "Offline", tone: "text-amber-600" }
          : { label: "Error", tone: "text-destructive" };

  return (
    <div className="space-y-4">
      {incoming ? (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <PhoneIncoming className="size-5 animate-pulse text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-foreground">Incoming call</p>
                <p className="text-sm text-muted-foreground">{fmtPhone(incomingFrom)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={acceptIncoming} className="bg-emerald-600 hover:bg-emerald-700"><Phone className="mr-1.5 size-4" /> Accept</Button>
              <Button type="button" size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={rejectIncoming}><PhoneOff className="mr-1.5 size-4" /> Decline</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Dialpad */}
        <Card className="border-border/80">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary"><PhoneCall className="size-5" /><h2 className="font-heading text-lg">Dialpad</h2></div>
              <span className={cn("flex items-center gap-1.5 text-xs font-medium", statusPill.tone)}>
                <span className={cn("size-2 rounded-full", status === "ready" ? "bg-emerald-500" : status === "error" ? "bg-destructive" : "bg-muted-foreground")} />
                {statusPill.label}
              </span>
            </div>

            <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Enter phone number" className="text-center text-lg tracking-wide" disabled={inCall} />

            {inCall ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
                <p className="text-sm font-medium text-foreground">{callState === "open" ? "On call" : callState === "ringing" ? "Ringing…" : "Connecting…"}</p>
                <p className="text-2xl font-semibold tabular-nums text-primary">{dur(seconds)}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-2">
              {KEYS.map(([k, sub]) => (
                <button key={k} type="button" onClick={() => pressKey(k)} className="flex flex-col items-center rounded-lg border border-border py-2.5 transition-colors hover:bg-muted">
                  <span className="text-lg font-medium text-foreground">{k}</span>
                  {sub ? <span className="text-[9px] tracking-widest text-muted-foreground">{sub}</span> : null}
                </button>
              ))}
            </div>

            {!inCall ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setNumber((n) => n.slice(0, -1))} disabled={!number}><Delete className="mr-1.5 size-4" /> Delete</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setNumber("")} disabled={!number}>Clear</Button>
                </div>
                <Button type="button" onClick={() => void startCall()} disabled={!number.trim() || status !== "ready"} className="w-full bg-emerald-600 py-6 text-base hover:bg-emerald-700">
                  <Phone className="mr-2 size-5" /> Call
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={toggleMute} className="flex-1">
                  {muted ? <MicOff className="mr-2 size-4" /> : <Mic className="mr-2 size-4" />} {muted ? "Unmute" : "Mute"}
                </Button>
                <Button type="button" onClick={hangup} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"><PhoneOff className="mr-2 size-4" /> End</Button>
              </div>
            )}

            <p className={cn("text-center text-xs", status === "ready" ? "text-emerald-600" : "text-muted-foreground")}>
              {status === "ready" ? "● Ready to call" : statusMsg ?? statusPill.label}
            </p>
          </CardContent>
        </Card>

        {/* Call history */}
        <Card className="border-border/80">
          <CardContent className="space-y-3 p-5">
            {callerIds.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dial out from</p>
                <div className="flex flex-wrap gap-1.5">
                  {callerIds.map((id) => (
                    <button key={id} type="button" onClick={() => setCallerId(id)} className={cn("rounded-lg border px-3 py-1.5 text-sm transition-colors", callerId === id ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-border text-foreground hover:bg-muted")}>
                      <Phone className="mr-1.5 inline size-3.5" />{fmtPhone(id)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setView("history")} className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium", view === "history" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}><RefreshCw className="size-3.5" /> Call History</button>
                <button type="button" onClick={() => setView("voicemail")} className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium", view === "voicemail" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}><Voicemail className="size-3.5" /> Voicemail{voicemails.length ? ` (${voicemails.length})` : ""}</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{historyRows.length} calls</span>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadCalls()}><RefreshCw className="mr-1.5 size-3.5" /> Refresh</Button>
              </div>
            </div>

            {view === "history" ? (
              <div className="flex gap-1.5">
                {(["all", "inbound", "outbound"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize", filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{f}</button>
                ))}
              </div>
            ) : null}

            {historyRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                {view === "voicemail" ? "No voicemails." : "No calls yet."}
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {historyRows.map((c) => {
                  const inbound = c.direction === "inbound";
                  const open = expandedId === c.id;
                  const number = inbound ? c.fromPhone : c.toPhone;
                  return (
                    <div key={c.id}>
                      <button type="button" onClick={() => { setExpandedId(open ? null : c.id); setNoteDraft((d) => ({ ...d, [c.id]: c.notes ?? "" })); }} className="flex w-full items-center gap-3 py-3 text-left">
                        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", inbound ? "bg-emerald-500/10 text-emerald-600" : "bg-sky-500/10 text-sky-600")}>
                          {inbound ? <PhoneIncoming className="size-4" /> : <PhoneOutgoing className="size-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-foreground">{c.contactName ?? fmtPhone(number)}</span>
                            {c.status ? <Badge variant={c.status === "failed" ? "destructive" : "outline"} className={cn("text-[10px]", c.status === "completed" && "text-emerald-600")}>{c.status}</Badge> : null}
                            {c.isVoicemail ? <Badge variant="secondary" className="text-[10px]">Voicemail</Badge> : null}
                            {c.recordingUrl ? <Badge variant="outline" className="text-[10px] text-purple-600">Recorded</Badge> : null}
                          </div>
                          <p className="text-xs text-muted-foreground">{dur(c.durationSeconds) || "—"}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{dt(c.createdAt)}</span>
                        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                      </button>
                      {open ? (
                        <div className="space-y-3 pb-4 pl-11">
                          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                            <div><p className="text-muted-foreground">Direction</p><p className="font-medium capitalize text-foreground">{c.direction}</p></div>
                            <div><p className="text-muted-foreground">Duration</p><p className="font-medium text-foreground">{dur(c.durationSeconds) || "—"}</p></div>
                            <div><p className="text-muted-foreground">Date &amp; time</p><p className="font-medium text-foreground">{dtFull(c.createdAt)}</p></div>
                            <div><p className="text-muted-foreground">Campaign</p><p className="font-medium text-foreground">{c.campaignTitle ?? "—"}</p></div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => callBack(c)}><Phone className="mr-1.5 size-3.5" /> Call back</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => textContact(c)}><MessageSquare className="mr-1.5 size-3.5" /> SMS</Button>
                          </div>
                          {c.recordingUrl ? (
                            <audio controls preload="none" src={`/api/admin/dialer/recording/${c.id}`} className="w-full" />
                          ) : null}
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Call notes</p>
                            <div className="flex items-start gap-2">
                              <Textarea value={noteDraft[c.id] ?? ""} onChange={(e) => setNoteDraft((d) => ({ ...d, [c.id]: e.target.value }))} placeholder="Add a note…" className="min-h-[44px] flex-1" />
                              <Button type="button" size="sm" onClick={() => void saveNote(c.id)}>Save</Button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
