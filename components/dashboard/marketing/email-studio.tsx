"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, Eye, Loader2, Mail, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketingPreviewDialog } from "@/components/dashboard/marketing/marketing-preview-dialog";
import { MarketingSection } from "@/components/dashboard/marketing/marketing-section";
import { VariantPicker } from "@/components/dashboard/marketing/variant-picker";
import type { Campaign } from "@/lib/campaigns";
import { buildMarketingContent } from "@/lib/marketing/campaign-content";
import { getVariant, type MarketingVariantId } from "@/lib/marketing/design-variants";
import {
  EMAIL_TEMPLATES,
  renderMarketingEmail,
  wrapEmailDocument,
  type EmailTemplateId,
} from "@/lib/marketing/email-templates";
import { cn } from "@/lib/utils";

const NO_CAMPAIGN = "__none__";

/**
 * Ready-to-send campaign emails.
 *
 * These are written for the family to *take away* — copy into Gmail, paste into
 * Mailchimp, download and forward. So the output options are the feature, not
 * an afterthought: rich copy for compose boxes, plain copy for editors that
 * refuse HTML, an .html file for tools that import one, and a test send so you
 * can see it land in your own inbox before anyone else does.
 */
export function EmailStudio({
  campaigns = [],
  variantId,
  onVariantChange,
}: {
  campaigns?: Campaign[];
  variantId: MarketingVariantId;
  onVariantChange: (id: MarketingVariantId) => void;
}) {
  const [slug, setSlug] = useState<string>(campaigns[0]?.slug ?? NO_CAMPAIGN);
  const [templateId, setTemplateId] = useState<EmailTemplateId>("announcement");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  const campaign = campaigns.find((c) => c.slug === slug) ?? null;
  const variant = getVariant(variantId);

  const email = useMemo(() => {
    if (!campaign) return null;
    return renderMarketingEmail(templateId, buildMarketingContent(campaign), variant);
  }, [campaign, templateId, variant]);

  const meta = EMAIL_TEMPLATES.find((t) => t.id === templateId)!;

  function flash(key: string) {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  }

  async function copyRich() {
    if (!email) return;
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([email.html], { type: "text/html" }),
            "text/plain": new Blob([email.text], { type: "text/plain" }),
          }),
        ]);
      } else {
        // Older Safari and Firefox without `clipboard.write`: plain text is a
        // worse paste, but it's better than a button that does nothing.
        await navigator.clipboard.writeText(email.text);
      }
      flash("rich");
    } catch {
      flash("error");
    }
  }

  async function copyPlain() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email.text);
      flash("plain");
    } catch {
      flash("error");
    }
  }

  function downloadHtml() {
    if (!email) return;
    const blob = new Blob([wrapEmailDocument(email)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaign?.slug ?? "campaign"}-${templateId}.html`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash("download");
  }

  async function sendTest() {
    if (!email || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      const response = await fetch("/api/marketing/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: email.subject,
          html: wrapEmailDocument(email),
          text: email.text,
        }),
      });
      const data = await response.json().catch(() => ({}));
      setSendResult(
        response.ok
          ? { ok: true, message: `Sent to ${data.sentTo ?? "your inbox"}.` }
          : { ok: false, message: data.error ?? "Could not send the test email." },
      );
    } catch {
      setSendResult({ ok: false, message: "Network error — the test email wasn't sent." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,460px)]">
      <div className="grid content-start gap-4 sm:grid-cols-2">
        <MarketingSection
          title="Campaign"
          description="Every email below fills itself in from this campaign."
          defaultOpen
          className="sm:col-span-2"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-campaign">Campaign</Label>
              <Select
                value={slug}
                onValueChange={(value) => setSlug(String(value))}
                items={{
                  [NO_CAMPAIGN]: "No campaign selected",
                  ...Object.fromEntries(campaigns.map((c) => [c.slug, c.title])),
                }}
              >
                <SelectTrigger id="email-campaign" className="mt-1.5 w-full">
                  <SelectValue placeholder="Choose a campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CAMPAIGN}>No campaign selected</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {campaign ? (
              <p className="text-sm text-muted-foreground">
                Pulling the headline, story, photo, totals and donate link from{" "}
                <strong className="text-foreground">{campaign.title}</strong>. Edit the campaign to
                change any of it.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose a campaign to fill these emails in. Without one there&rsquo;s nothing to send.
              </p>
            )}
          </div>
        </MarketingSection>

        <MarketingSection
          title="Which email"
          description="Five sends that cover a campaign from launch to thank-you."
          defaultOpen
          className="sm:col-span-2"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {EMAIL_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                aria-pressed={templateId === t.id}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  templateId === t.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-muted/50",
                )}
              >
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <Mail className="size-4 shrink-0 text-primary" aria-hidden />
                  {t.name}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{t.description}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{meta.timing}</p>
        </MarketingSection>

        <MarketingSection title="Design" description="Applies to postcards and social too.">
          <VariantPicker value={variantId} onChange={onVariantChange} compact />
        </MarketingSection>

        <MarketingSection title="Subject line" description="Copy this into your email tool.">
          {email ? (
            <div className="space-y-3">
              <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm font-medium text-foreground">
                {email.subject}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Preview text:</span> {email.preheader}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  void navigator.clipboard?.writeText(email.subject).then(() => flash("subject"));
                }}
              >
                {copied === "subject" ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied === "subject" ? "Copied" : "Copy subject"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Choose a campaign first.</p>
          )}
        </MarketingSection>

        <MarketingSection
          title="Send it"
          description="Four ways to get this email out of ACTSTO and into your own tool."
          defaultOpen
          className="sm:col-span-2"
        >
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="gap-1.5" onClick={() => setPreviewOpen(true)} disabled={!email}>
              <Eye className="size-4" />
              Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => void copyRich()}
              disabled={!email}
            >
              {copied === "rich" ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied === "rich" ? "Copied" : "Copy as rich text"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => void copyPlain()}
              disabled={!email}
            >
              {copied === "plain" ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied === "plain" ? "Copied" : "Copy as plain text"}
            </Button>
            <Button type="button" variant="outline" className="gap-1.5" onClick={downloadHtml} disabled={!email}>
              <Download className="size-4" />
              Download .html
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => void sendTest()}
              disabled={!email || sending}
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {sending ? "Sending…" : "Send a test to me"}
            </Button>
          </div>

          {copied === "error" ? (
            <p role="status" className="mt-3 text-sm text-destructive">
              Your browser blocked the clipboard. Open the preview and copy from there.
            </p>
          ) : null}
          {sendResult ? (
            <p
              role="status"
              className={cn("mt-3 text-sm", sendResult.ok ? "text-foreground" : "text-destructive")}
            >
              {sendResult.message}
            </p>
          ) : null}

          <p className="mt-4 text-xs text-muted-foreground">
            <strong className="text-foreground">Rich text</strong> keeps the layout when you paste into
            Gmail, Outlook or Apple Mail. <strong className="text-foreground">Plain text</strong> is for
            tools that strip formatting. <strong className="text-foreground">.html</strong> imports into
            Mailchimp, Constant Contact and similar.
          </p>
        </MarketingSection>
      </div>

      <div className="xl:sticky xl:top-24">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="font-heading text-base font-semibold text-primary">Live preview</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setPreviewOpen(true)}
              disabled={!email}
            >
              <Eye className="size-4" />
              Open
            </Button>
          </div>
          <div className="p-3">
            {email ? (
              <iframe
                sandbox=""
                title="Email preview"
                srcDoc={wrapEmailDocument(email)}
                className="h-[520px] w-full rounded-lg border border-border bg-white"
              />
            ) : (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Choose a campaign to see the email.
              </p>
            )}
          </div>
        </div>
      </div>

      {email ? (
        <MarketingPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title={email.subject}
          description={`${meta.name} · ${variant.name} design`}
          html={wrapEmailDocument(email)}
          shareUrl={campaign ? buildMarketingContent(campaign).url : undefined}
          copies={[
            { label: "Copy rich text", value: () => email.html, html: true },
            { label: "Copy plain text", value: () => email.text },
          ]}
          downloads={[
            {
              label: "Download .html",
              filename: `${campaign?.slug ?? "campaign"}-${templateId}.html`,
              content: () => wrapEmailDocument(email),
              mimeType: "text/html;charset=utf-8",
            },
          ]}
          options={
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => void sendTest()}
              disabled={sending}
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {sending ? "Sending…" : "Send a test"}
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
