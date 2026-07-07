"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Loader2, Mic, Send, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { SHEPARD_ICON_RED } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };
type PendingAction = { id: string; toolName: string; args: Record<string, unknown> };

const TEMPLATE_PROMPTS = [
  "Invite a new parent account",
  "Show pending campaign approvals",
  "Create an invoice for a business donor",
  "Draft an SMS to a family",
  "Draft a new blog post",
];

export type ShepardEntryMode = "type" | "voice" | "templates";

export function ShepardChatModal({
  open,
  onOpenChange,
  initialMode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode: ShepardEntryMode;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, { ok: boolean; note: string }>>({});
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    fetch("/api/admin/shepard/conversations")
      .then((res) => res.json())
      .then((data) => {
        if (data.conversation) {
          setConversationId(data.conversation.id);
          setMessages(data.conversation.messages);
          setPendingActions(data.conversation.pendingActions);
        }
      })
      .catch(() => {});

    if (initialMode === "voice") void startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pendingActions]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    setSending(true);
    const optimisticId = `local-${Date.now()}`;
    setMessages((m) => [...m, { id: optimisticId, role: "user", content: trimmed }]);
    setInput("");
    try {
      const res = await fetch("/api/admin/shepard/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Shepard could not respond.");
      setConversationId(data.conversationId);
      if (data.reply) {
        setMessages((m) => [...m, { id: `assistant-${Date.now()}`, role: "assistant", content: data.reply }]);
      }
      if (data.pendingActions?.length) {
        setPendingActions((prev) => [...prev, ...data.pendingActions]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Shepard could not respond.");
    } finally {
      setSending(false);
    }
  }

  async function resolveAction(actionId: string, decision: "confirm" | "reject") {
    setBusyActionId(actionId);
    try {
      const res = await fetch(`/api/admin/shepard/actions/${actionId}/${decision}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update this action.");
      setPendingActions((prev) => prev.filter((a) => a.id !== actionId));
      setActionResults((prev) => ({
        ...prev,
        [actionId]:
          decision === "confirm"
            ? { ok: data.action.status === "executed", note: data.action.status === "executed" ? "Done." : "Failed — see details." }
            : { ok: false, note: "Cancelled." },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update this action.");
    } finally {
      setBusyActionId(null);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("audio", blob, "voice-note.webm");
        setSending(true);
        try {
          const res = await fetch("/api/admin/shepard/transcribe", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Could not transcribe audio.");
          setInput(data.text ?? "");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not transcribe audio.");
        } finally {
          setSending(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access is required for voice notes.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  const hasUnresolvedAction = pendingActions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image src={SHEPARD_ICON_RED} alt="" width={22} height={22} className="shrink-0" />
            Shepard
          </DialogTitle>
          <DialogDescription>Your AI assistant for the Super Admin dashboard.</DialogDescription>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-2">
          {messages.length === 0 && !pendingActions.length ? (
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-full border border-border/80 bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex items-end gap-2", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "assistant" ? (
                <Image src={SHEPARD_ICON_RED} alt="" width={20} height={20} className="mb-1 shrink-0" />
              ) : null}
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {pendingActions.map((action) => (
            <div key={action.id} className="rounded-lg border border-amber-500/40 bg-amber-50/60 p-3 dark:bg-amber-500/10">
              <p className="text-sm font-medium">
                Shepard wants to run <span className="font-mono">{action.toolName}</span>
              </p>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-background/60 p-2 text-xs">
                {JSON.stringify(action.args, null, 2)}
              </pre>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  disabled={busyActionId === action.id}
                  onClick={() => void resolveAction(action.id, "confirm")}
                >
                  {busyActionId === action.id ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Check className="mr-1 size-3.5" />}
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyActionId === action.id}
                  onClick={() => void resolveAction(action.id, "reject")}
                >
                  <X className="mr-1 size-3.5" />
                  Decline
                </Button>
              </div>
            </div>
          ))}

          {Object.entries(actionResults).map(([id, result]) => (
            <p key={id} className={cn("text-xs", result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {result.note}
            </p>
          ))}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="flex items-end gap-2 border-t border-border pt-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={hasUnresolvedAction ? "Resolve the pending action above first…" : "Ask Shepard to do something…"}
            disabled={hasUnresolvedAction || sending}
            className="min-h-[44px] flex-1 resize-none"
          />
          <Button
            type="button"
            variant={recording ? "destructive" : "outline"}
            size="icon"
            disabled={hasUnresolvedAction || sending}
            onClick={() => (recording ? stopRecording() : void startRecording())}
            aria-label={recording ? "Stop recording" : "Record a voice note"}
          >
            {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
          </Button>
          <Button
            type="button"
            size="icon"
            disabled={hasUnresolvedAction || sending || !input.trim()}
            onClick={() => void sendMessage(input)}
            aria-label="Send"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
