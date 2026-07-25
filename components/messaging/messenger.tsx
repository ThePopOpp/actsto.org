"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageSquarePlus, Search, Send, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Identity = { userId: string; name: string; avatarUrl: string | null; role: string | null };
type Message = { id: string; senderId: string; body: string; createdAt: string };
type ConversationRow = {
  id: string;
  others: Identity[];
  title: string | null;
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  lastMessageAt: string;
  unread: number;
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}
function timeShort(v: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(v));
}
function timeFull(v: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(v));
}
function roleLabel(role: string | null) {
  switch (role) {
    case "admin": return "Admin";
    case "parent": return "Parent";
    case "student": return "Student";
    case "donor": return "Donor";
    default: return null;
  }
}

function Avatar({ identity, size = "md" }: { identity: Identity; size?: "sm" | "md" }) {
  const sizeCls = size === "sm" ? "size-8" : "size-9";
  return identity.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={identity.avatarUrl} alt="" className={cn("shrink-0 rounded-full object-cover", sizeCls)} />
  ) : (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary", sizeCls)}>
      {initials(identity.name)}
    </span>
  );
}

export function Messenger({ currentUserId }: { currentUserId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ participants: Identity[]; messages: Message[] } | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recipients, setRecipients] = useState<Identity[]>([]);
  const [searching, setSearching] = useState(false);

  const selectedIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/messages/conversations", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { conversations?: ConversationRow[] } | null;
    if (res.ok && data) setConversations(data.conversations ?? []);
    setLoadingList(false);
  }, []);

  const openThread = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoadingThread(true);
    const res = await fetch(`/api/messages/conversations/${id}`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { participants?: Identity[]; messages?: Message[] } | null;
    if (res.ok && data) setThread({ participants: data.participants ?? [], messages: data.messages ?? [] });
    setLoadingThread(false);
    await fetch(`/api/messages/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: true }) });
    void loadList();
  }, [loadList]);

  useEffect(() => {
    // loadList is async; setState runs after the fetch resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadList();
  }, [loadList]);

  // Realtime: new messages in any conversation the user participates in (RLS-scoped).
  useEffect(() => {
    const channel = supabase
      .channel("dm-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const row = payload.new as { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
        if (row.conversation_id === selectedIdRef.current && row.sender_id !== currentUserId) {
          setThread((cur) => (cur ? { ...cur, messages: [...cur.messages, { id: row.id, senderId: row.sender_id, body: row.body, createdAt: row.created_at }] } : cur));
        }
        void loadList();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId, loadList]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread]);

  // Recipient search (debounced).
  useEffect(() => {
    if (!newOpen) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/messages/recipients?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { recipients?: Identity[] } | null;
      if (!cancelled && res.ok && data) setRecipients(data.recipients ?? []);
      if (!cancelled) setSearching(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, newOpen]);

  async function startWith(recipientId: string) {
    const res = await fetch("/api/messages/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipientId }) });
    const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
    if (res.ok && data?.id) {
      setNewOpen(false);
      setQuery("");
      await loadList();
      await openThread(data.id);
    }
  }

  async function send() {
    const value = text.trim();
    if (!value || !selectedId) return;
    setSending(true);
    setText("");
    const optimistic: Message = { id: `tmp-${Date.now()}`, senderId: currentUserId, body: value, createdAt: new Date().toISOString() };
    setThread((cur) => (cur ? { ...cur, messages: [...cur.messages, optimistic] } : cur));
    const res = await fetch(`/api/messages/conversations/${selectedId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: value }) });
    const data = (await res.json().catch(() => null)) as { message?: Message; error?: string } | null;
    setSending(false);
    if (res.ok && data?.message) {
      setThread((cur) => (cur ? { ...cur, messages: cur.messages.map((m) => (m.id === optimistic.id ? data.message! : m)) } : cur));
      void loadList();
    }
  }

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;
  const threadTitle = selectedConv?.others.map((o) => o.name).join(", ") ?? thread?.participants.filter((p) => p.userId !== currentUserId).map((p) => p.name).join(", ") ?? "Conversation";

  return (
    <Card className="overflow-hidden border-border/80">
      <CardContent className="grid h-[calc(100vh-13rem)] min-h-[520px] grid-cols-1 p-0 md:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <div className={cn("flex flex-col border-r border-border/60", selectedId && "hidden md:flex")}>
          <div className="flex items-center justify-between gap-2 border-b border-border/60 p-3">
            <h2 className="font-heading text-base font-semibold text-primary">Messages</h2>
            <Button type="button" size="sm" onClick={() => { setNewOpen(true); setQuery(""); setRecipients([]); }}><MessageSquarePlus className="mr-1.5 size-4" /> New</Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
            ) : conversations.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No conversations yet. Tap <strong>New</strong> to start one.</p>
            ) : (
              conversations.map((c) => {
                const other = c.others[0] ?? { userId: "", name: c.title ?? "Conversation", avatarUrl: null, role: null };
                return (
                  <button key={c.id} type="button" onClick={() => void openThread(c.id)} className={cn("flex w-full items-center gap-3 border-b border-border/40 px-3 py-3 text-left transition-colors hover:bg-muted/30", selectedId === c.id && "bg-muted/40")}>
                    <Avatar identity={other} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("truncate text-sm", c.unread > 0 ? "font-semibold text-foreground" : "text-foreground")}>{c.others.map((o) => o.name).join(", ") || other.name}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{timeShort(c.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">{c.lastMessage ? `${c.lastMessage.senderId === currentUserId ? "You: " : ""}${c.lastMessage.body}` : "No messages yet"}</p>
                        {c.unread > 0 ? <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-act-red text-[10px] font-semibold text-white">{c.unread}</span> : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={cn("flex flex-col", !selectedId && "hidden md:flex")}>
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">Select a conversation to start messaging.</div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border/60 p-3">
                <button type="button" className="md:hidden" onClick={() => { setSelectedId(null); setThread(null); }}><ArrowLeft className="size-5 text-muted-foreground" /></button>
                <span className="truncate font-medium text-foreground">{threadTitle}</span>
                {thread?.participants.find((p) => p.userId !== currentUserId)?.role ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{roleLabel(thread.participants.find((p) => p.userId !== currentUserId)?.role ?? null)}</span>
                ) : null}
              </div>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-muted/10 p-4">
                {loadingThread ? (
                  <p className="text-center text-sm text-muted-foreground">Loading…</p>
                ) : (
                  thread?.messages.map((m) => {
                    const mine = m.senderId === currentUserId;
                    return (
                      <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground")}>
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{timeFull(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex items-end gap-2 border-t border-border/60 p-3">
                <Textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Type a message…" className="max-h-32 min-h-[44px] flex-1 resize-none" />
                <Button type="button" onClick={() => void send()} disabled={sending || !text.trim()}>{sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</Button>
              </div>
            </>
          )}
        </div>
      </CardContent>

      {/* New message picker */}
      {newOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-24" onClick={() => setNewOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/60 p-3">
              <span className="font-medium text-foreground">New message</span>
              <button type="button" onClick={() => setNewOpen(false)}><X className="size-5 text-muted-foreground" /></button>
            </div>
            <div className="p-3">
              <div className="relative">
                <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people you can message…" className="pl-8" />
              </div>
              <div className="mt-2 max-h-72 overflow-y-auto">
                {searching ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">Searching…</p>
                ) : recipients.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">No matching people.</p>
                ) : (
                  recipients.map((r) => (
                    <button key={r.userId} type="button" onClick={() => void startWith(r.userId)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted/40">
                      <Avatar identity={r} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{r.name}</p>
                        {roleLabel(r.role) ? <p className="text-xs text-muted-foreground">{roleLabel(r.role)}</p> : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
