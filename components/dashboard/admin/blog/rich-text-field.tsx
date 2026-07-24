"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import "./rich-text-field.css";

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  { label: "Sans", value: "Arial, Helvetica, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "'Courier New', monospace" },
  { label: "Rounded", value: "'Trebuchet MS', sans-serif" },
];

const FONT_SIZES: { label: string; value: string }[] = [
  { label: "Size", value: "" },
  { label: "Small", value: "13px" },
  { label: "Normal", value: "16px" },
  { label: "Large", value: "20px" },
  { label: "XL", value: "26px" },
  { label: "XXL", value: "32px" },
];

const TEXT_COLORS = ["#374151", "#1e2a4a", "#a93226", "#0f766e", "#b45309", "#7c3aed", "#be185d", "#ffffff"];

function Btn({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1">
      <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" />
      </Btn>
      <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </Btn>
      <Btn
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-4" />
      </Btn>
      <Btn
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-4" />
      </Btn>

      <span className="mx-1 h-5 w-px bg-border" />

      <Btn
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" />
      </Btn>
      <Btn
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="size-4" />
      </Btn>
      <Btn
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </Btn>
      <Btn
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </Btn>
      <Btn
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </Btn>

      <span className="mx-1 h-5 w-px bg-border" />

      <Btn
        label="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="size-4" />
      </Btn>
      <Btn
        label="Align center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="size-4" />
      </Btn>
      <Btn
        label="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="size-4" />
      </Btn>
      <Btn
        label="Justify"
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="size-4" />
      </Btn>

      <span className="mx-1 h-5 w-px bg-border" />

      <select
        aria-label="Font family"
        className="h-7 rounded border border-border bg-background px-1 text-xs text-foreground"
        value={(editor.getAttributes("textStyle").fontFamily as string) ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setFontFamily(v).run();
          else editor.chain().focus().unsetFontFamily().run();
        }}
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Font size"
        className="h-7 rounded border border-border bg-background px-1 text-xs text-foreground"
        value={(editor.getAttributes("textStyle").fontSize as string) ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setFontSize(v).run();
          else editor.chain().focus().unsetFontSize().run();
        }}
      >
        {FONT_SIZES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <span className="mx-1 h-5 w-px bg-border" />

      <label className="inline-flex items-center" title="Text color">
        <span className="sr-only">Text color</span>
        <input
          type="color"
          aria-label="Text color"
          className="size-6 cursor-pointer rounded border border-border bg-background p-0.5"
          value={(editor.getAttributes("textStyle").color as string) ?? "#374151"}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
      </label>
      <div className="flex items-center gap-0.5">
        {TEXT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Set color ${c}`}
            title={c}
            onClick={() => editor.chain().focus().setColor(c).run()}
            className="size-4 rounded-full border border-border/70"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <span className="mx-1 h-5 w-px bg-border" />

      <Btn label="Link" active={editor.isActive("link")} onClick={setLink}>
        <Link2 className="size-4" />
      </Btn>
      <Btn
        label="Clear formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        <Eraser className="size-4" />
      </Btn>
    </div>
  );
}

export function RichTextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      FontFamily.configure({ types: ["textStyle"] }),
      FontSize.configure({ types: ["textStyle"] }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "Write your paragraph…" }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "tiptap focus:outline-none" },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.isEmpty ? "" : ed.getHTML());
    },
  });

  // Sync in external content changes (e.g. AI rewrite) without clobbering typing.
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div className="rtf-content overflow-hidden rounded-md border border-border bg-background">
      {editor ? <Toolbar editor={editor} /> : null}
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
