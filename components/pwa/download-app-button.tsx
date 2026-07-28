"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { buttonVariants, type ButtonVariantProps } from "@/lib/button-variants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DownloadAppButtonProps = {
  label?: string;
  className?: string;
  variant?: ButtonVariantProps["variant"];
  size?: ButtonVariantProps["size"];
  withIcon?: boolean;
  /** Retained for API compatibility with existing call sites (no longer used). */
  hideWhenInstalled?: boolean;
  onDone?: () => void;
};

const OS_OPTIONS = ["iOS", "iPadOS", "Android", "Windows", "macOS", "Other"];

/**
 * The native app is coming soon. This button opens a "notify me" waitlist form;
 * submissions are saved as CRM contacts. (The PWA install flow was retired.)
 */
export function DownloadAppButton({
  label = "Get the App",
  className,
  variant = "outline",
  size = "sm",
  withIcon = true,
  onDone,
}: DownloadAppButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [os, setOs] = useState("iOS");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, os }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not submit. Please try again.");
      setDone(true);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ variant, size }), className)}
        aria-label={label}
      >
        {withIcon ? <Download className="size-4" aria-hidden /> : null}
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-primary">The ACTSTO app is coming soon</DialogTitle>
            <DialogDescription>
              Leave your details and we&apos;ll notify you the moment the app launches.
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="py-6 text-center">
              <p className="text-lg font-semibold text-primary">You&apos;re on the list! 🎉</p>
              <p className="mt-2 text-sm text-muted-foreground">We&apos;ll email you when the app is ready.</p>
              <Button type="button" className="mt-5" onClick={() => setOpen(false)}>Done</Button>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div>
                <Label className="text-xs text-muted-foreground">Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Phone (optional)</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Device</Label>
                  <Select value={os} onValueChange={(v) => setOs(v ?? "iOS")}>
                    <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{OS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={busy || !name.trim() || !email.trim()}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Notify me
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
