"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Maximize2, Minimize2, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type PreviewDownload = {
  label: string;
  filename: string;
  /** Resolved lazily so a heavy render only happens on click. */
  content: () => string;
  mimeType: string;
};

export type PreviewCopy = {
  label: string;
  /** Plain string, or rich HTML when `html` is true. */
  value: () => string;
  html?: boolean;
};

/**
 * One preview surface for every marketing channel.
 *
 * Postcards and social pass React nodes; emails pass raw HTML, which renders in
 * a sandboxed iframe so inbox-grade CSS can't leak into the dashboard (and so
 * what you see is closer to what an inbox will do with it).
 *
 * Expand is a real requirement rather than polish — a 6×4 postcard proof at
 * dialog width is too small to catch a typo in the return address.
 */
export function MarketingPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  shareUrl,
  downloads = [],
  copies = [],
  options,
  html,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Enables the Share button. Falls back to copying when the OS sheet is absent. */
  shareUrl?: string;
  downloads?: PreviewDownload[];
  copies?: PreviewCopy[];
  /** Extra controls specific to the channel. */
  options?: React.ReactNode;
  /** Email HTML, rendered in a sandboxed iframe. Ignored when `children` is set. */
  html?: string;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // Confirmations are transient; clear the pending timer if the dialog closes
  // first so it can't fire against an unmounted component.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function confirm(key: string) {
    setDone(key);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setDone(null), 1800);
  }

  async function copy(item: PreviewCopy) {
    const value = item.value();
    try {
      if (item.html && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        // Rich copy: the HTML flavour is what a compose box picks up, and the
        // plain flavour is the fallback for editors that refuse HTML.
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([value], { type: "text/html" }),
            "text/plain": new Blob([stripTags(value)], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(item.html ? stripTags(value) : value);
      }
      confirm(item.label);
    } catch {
      confirm("failed");
    }
  }

  function download(item: PreviewDownload) {
    const blob = new Blob([item.content()], { type: item.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.filename;
    a.click();
    // Revoke on the next tick — revoking synchronously can beat the download in
    // Safari.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    confirm(item.label);
  }

  async function share() {
    if (!shareUrl) return;
    try {
      // `typeof` rather than a truthiness check: TS types `navigator.share` as
      // always present, so `if (navigator.share)` narrows the else branch away.
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      confirm("Link");
    } catch {
      /* the user dismissed the share sheet — not an error */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col overflow-hidden p-0",
          expanded
            ? "h-[94vh] w-[calc(100vw-1.5rem)] max-w-none sm:max-w-none"
            : "max-h-[90vh] w-[calc(100vw-2rem)] sm:max-w-2xl",
        )}
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
          {children ?? (
            <iframe
              // `sandbox` with no allow-scripts: this is untrusted-shaped content
              // being rendered for proofing, and it never needs to run anything.
              sandbox=""
              title={`${title} preview`}
              srcDoc={html ?? ""}
              className="h-full min-h-[60vh] w-full rounded-lg border border-border bg-white"
            />
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-background px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setExpanded((x) => !x)}
          >
            {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            {expanded ? "Shrink" : "Expand"}
          </Button>

          {copies.map((item) => (
            <Button
              key={item.label}
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void copy(item)}
            >
              {done === item.label ? <Check className="size-4" /> : <Copy className="size-4" />}
              {done === item.label ? "Copied" : item.label}
            </Button>
          ))}

          {downloads.map((item) => (
            <Button
              key={item.label}
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => download(item)}
            >
              <Download className="size-4" />
              {item.label}
            </Button>
          ))}

          {shareUrl ? (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void share()}>
              {done === "Link" ? <Check className="size-4" /> : <Share2 className="size-4" />}
              {done === "Link" ? "Link copied" : "Share"}
            </Button>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-2">{options}</div>
        </div>

        {done === "failed" ? (
          <p role="status" className="border-t border-border bg-destructive/10 px-5 py-2 text-xs text-destructive">
            Your browser blocked the clipboard. Select the preview and copy manually.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Crude but adequate: only ever fed our own generated markup. */
function stripTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&middot;/g, "·")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
