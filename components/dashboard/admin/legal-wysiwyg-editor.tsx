"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Bold, Italic, Link2, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/lib/button-variants";
import type { LegalSlug } from "@/lib/legal/slug";
import { publicLegalPath } from "@/lib/legal/slug";
import { cn } from "@/lib/utils";

type LegalApiResponse = {
  slug: string;
  savedHtml: string | null;
  updatedAt: string | null;
  defaultHtml: string;
};

function stripWrappingDoc(html: string): string {
  const t = html.trim();
  const doc = /^<body[^>]*>([\s\S]*)<\/body>/i.exec(t);
  if (doc) return doc[1].trim();
  const meta = /^<!DOCTYPE[\s\S]*?<body[^>]*>([\s\S]*)<\/body>/i.exec(t);
  if (meta) return meta[1].trim();
  return t;
}

export function LegalWysiwygEditor({ slug }: { slug: LegalSlug }) {
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [updatedLabel, setUpdatedLabel] = useState<string | null>(null);
  const publicHref = publicLegalPath(slug);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),
        LinkExtension.configure({
          openOnClick: false,
          HTMLAttributes: { class: "text-primary underline underline-offset-4" },
        }),
        Placeholder.configure({
          placeholder: "Compose or paste legal content…",
        }),
      ],
      editorProps: {
        attributes: {
          class: cn(
            "max-w-none min-h-[min(60vh,520px)] px-3 py-2 outline-none",
            "[&_h2]:mt-6 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-primary",
            "[&_h3]:mt-4 [&_h3]:font-heading [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground",
            "[&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:text-muted-foreground",
            "[&_strong]:font-semibold [&_strong]:text-foreground"
          ),
        },
      },
    },
    [slug]
  );

  useEffect(() => {
    if (!editor) return;
    let cancelled = false;

    async function run() {
      setStatus("loading");
      setMessage(null);
      const res = await fetch(`/api/admin/legal?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) {
        if (!cancelled) {
          setMessage("Could not load document.");
          setStatus("idle");
        }
        return;
      }
      const data = (await res.json()) as LegalApiResponse;
      const html = stripWrappingDoc(data.savedHtml ?? data.defaultHtml);
      if (cancelled || !editor) return;
      setUpdatedLabel(
        data.updatedAt
          ? `Saved version: ${new Date(data.updatedAt).toLocaleString()}`
          : "Showing site default (not saved yet)"
      );
      editor.commands.setContent(html, { emitUpdate: false });
      setStatus("idle");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [slug, editor]);

  async function save() {
    if (!editor) return;
    setStatus("saving");
    setMessage(null);
    const bodyHtml = editor.getHTML();
    const res = await fetch("/api/admin/legal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, bodyHtml }),
    });
    if (res.status === 403) {
      setMessage("Sign in as super admin to save changes (preview mode is read-only).");
      setStatus("idle");
      return;
    }
    if (!res.ok) {
      setMessage("Save failed.");
      setStatus("idle");
      return;
    }
    setMessage("Saved. Public pages will show this version.");
    setUpdatedLabel(`Saved version: ${new Date().toLocaleString()}`);
    setStatus("idle");
  }

  async function revertToDefault() {
    if (!editor || !confirm("Remove saved copy and use built-in default text for this document?")) return;
    setMessage(null);
    const res = await fetch(`/api/admin/legal?slug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    if (res.status === 403) {
      setMessage("Sign in as super admin to reset (preview mode is read-only).");
      return;
    }
    if (!res.ok) {
      setMessage("Reset failed.");
      return;
    }
    const fresh = await fetch(`/api/admin/legal?slug=${encodeURIComponent(slug)}`);
    if (!fresh.ok) {
      setMessage("Reload after reset failed.");
      return;
    }
    const data = (await fresh.json()) as LegalApiResponse;
    const html = stripWrappingDoc(data.defaultHtml);
    editor.commands.setContent(html, { emitUpdate: false });
    setUpdatedLabel("Showing site default (not saved yet)");
    setMessage("Reverted to site default. Save again to publish a custom version.");
  }

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{updatedLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            View public page
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={() => void revertToDefault()}>
            Reset to default
          </Button>
          <Button type="button" size="sm" disabled={status === "loading" || status === "saving"} onClick={() => void save()}>
            {status === "saving" ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1 rounded-lg border border-input bg-muted/30 p-1">
        <ToolbarIcon
          label="Bold"
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          icon={Bold}
        />
        <ToolbarIcon
          label="Italic"
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          icon={Italic}
        />
        <ToolbarBtn
          label="Heading 2"
          active={editor?.isActive("heading", { level: 2 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarBtn>
        <ToolbarBtn
          label="Heading 3"
          active={editor?.isActive("heading", { level: 3 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarBtn>
        <ToolbarIcon
          label="Bullet list"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          icon={List}
        />
        <ToolbarIcon
          label="Ordered list"
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          icon={ListOrdered}
        />
        <ToolbarIcon label="Link" onClick={setLink} icon={Link2} />
        <ToolbarIcon label="Undo" onClick={() => editor?.chain().focus().undo().run()} icon={Undo2} />
        <ToolbarIcon label="Redo" onClick={() => editor?.chain().focus().redo().run()} icon={Redo2} />
      </div>

      <div className="rounded-lg border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring/50">
        <EditorContent editor={editor} />
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: In Word, use <em>Save As → Web Page, Filtered</em> or paste sections here. Complex Word styles may need
        cleanup. Always review the public page after saving. Replace site defaults with your ACT-*.docx content when
        ready.
      </p>
    </div>
  );
}

function ToolbarIcon({
  label,
  onClick,
  icon: Icon,
  active,
}: {
  label: string;
  onClick: () => void;
  icon: LucideIcon;
  active?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      className="size-8"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon className="size-4" />
    </Button>
  );
}

function ToolbarBtn({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      className="min-w-8 px-1.5 font-bold"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}
