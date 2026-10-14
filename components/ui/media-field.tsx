"use client";

import { useId, useRef, useState } from "react";
import { FileAudio, Film, ImageUp, Link2, Loader2, Plus, X } from "lucide-react";

import { ActLogo } from "@/components/act-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, FACE_SAFE_CROP, initialsOf } from "@/lib/utils";

/**
 * The one upload field for every image, logo, gallery, video and audio file on
 * the site, frontend and dashboards.
 *
 * Upload comes first: a branded ACTSTO drop area (the wordmark swaps for light
 * and dark mode). Pasting a link is the secondary option, behind the
 * "Use a link instead" switch. What is saved shows as a preview, so people can
 * see the right file landed.
 *
 * Single value: pass `value` and `onChange` ("" clears it).
 * Several values (a gallery): pass `multiple`, `values` and `onChangeValues`.
 */
export type MediaKind = "image" | "video" | "audio" | "image-video";

const ACCEPT: Record<MediaKind, string> = {
  image: "image/png,image/jpeg,image/webp,image/gif,image/avif",
  video: "video/mp4,video/webm,video/quicktime",
  audio: "audio/*",
  "image-video": "image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime",
};

const NOUN: Record<MediaKind, string> = {
  image: "image",
  video: "video",
  audio: "audio file",
  "image-video": "image or video",
};

function looksLikeVideo(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url) || /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

function looksLikeAudio(url: string) {
  return /\.(mp3|m4a|wav|ogg|aac)(\?|#|$)/i.test(url);
}

/** Files uploaded here (Supabase storage), or older uploads kept as data URLs. */
function isUploaded(value: string) {
  return /\/storage\/v1\/object\/public\//.test(value) || value.startsWith("data:");
}

function isLink(value: string) {
  return /^(https?:\/\/|\/)/i.test(value.trim());
}

type CommonProps = {
  /** Field label. Omit when the surrounding form already labels it. */
  label?: string;
  id?: string;
  kind?: MediaKind;
  /** Upload route. Defaults to the shared /api/media/upload. */
  endpoint?: string;
  /** Storage folder for /api/media/upload, e.g. "schools". */
  folder?: string;
  /** Shown under the drop area: sizes, what the image is used for. */
  hint?: string;
  /** Preview shape: wide (photos), round (people), square (logos). */
  shape?: "wide" | "round" | "square";
  /** Initials shown in place of a missing round photo. */
  fallbackName?: string | null;
  /** A shorter drop area, for dense forms. */
  compact?: boolean;
  /** Leave out the thumbnails, when the form shows each file itself. */
  hidePreview?: boolean;
  disabled?: boolean;
  className?: string;
};

type SingleProps = CommonProps & {
  multiple?: false;
  value: string | null | undefined;
  onChange: (url: string) => void;
};

type MultipleProps = CommonProps & {
  multiple: true;
  values: string[];
  onChangeValues: (urls: string[]) => void;
  /** Most files a gallery may hold. */
  max?: number;
};

export function MediaField(props: SingleProps | MultipleProps) {
  const {
    label,
    kind = "image",
    endpoint = "/api/media/upload",
    folder,
    hint,
    shape = "wide",
    fallbackName,
    compact = false,
    hidePreview = false,
    disabled = false,
    className,
  } = props;
  const autoId = useId();
  const id = props.id ?? `media-${autoId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");

  const multiple = props.multiple === true;
  const current = multiple ? props.values : props.value ? [props.value] : [];
  const max = multiple ? props.max ?? 24 : 1;
  // A value that was pasted rather than uploaded opens on the link view, so
  // people can see and correct it.
  const [linkMode, setLinkMode] = useState(
    () => !multiple && Boolean(props.value) && !isUploaded(props.value ?? ""),
  );
  const noun = NOUN[kind];

  function setAll(next: string[]) {
    if (props.multiple) props.onChangeValues(Array.from(new Set(next)).slice(0, max));
    else props.onChange(next[0] ?? "");
  }

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).slice(0, multiple ? Math.max(0, max - current.length) : 1);
    if (list.length === 0) {
      setStatus({ error: true, text: `This gallery holds up to ${max} files.` });
      return;
    }
    setBusy(true);
    setStatus({ error: false, text: list.length > 1 ? `Uploading ${list.length} files…` : "Uploading…" });
    const uploaded: string[] = [];
    try {
      for (const file of list) {
        const body = new FormData();
        body.append("file", file);
        if (folder) body.append("folder", folder);
        const res = await fetch(endpoint, { method: "POST", body });
        const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
        if (!res.ok || !data?.url) throw new Error(data?.error ?? "Upload failed.");
        uploaded.push(data.url);
      }
      setStatus({ error: false, text: `Uploaded ${uploaded.length} file${uploaded.length === 1 ? "" : "s"}.` });
    } catch (error) {
      setStatus({ error: true, text: error instanceof Error ? error.message : "Upload failed." });
    } finally {
      if (uploaded.length) setAll(multiple ? [...current, ...uploaded] : uploaded);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function addLink() {
    const url = linkDraft.trim();
    if (!url) return;
    if (!isLink(url)) {
      setStatus({ error: true, text: "Paste a full link starting with https://" });
      return;
    }
    setAll([...current, url]);
    setLinkDraft("");
    setStatus(null);
  }

  const canAddMore = multiple ? current.length < max : true;

  return (
    <div className={cn("space-y-2", className)}>
      {(
        <div className="flex flex-wrap items-center justify-between gap-2">
          {label ? <Label htmlFor={linkMode ? `${id}-link` : id}>{label}</Label> : <span />}
          <button
            type="button"
            role="switch"
            aria-checked={linkMode}
            onClick={() => setLinkMode((on) => !on)}
            disabled={disabled}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <Link2 className="size-3.5" aria-hidden />
            Use a link instead
            <span
              aria-hidden
              className={cn(
                "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
                linkMode ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "absolute size-3 rounded-full bg-background shadow-sm transition-transform",
                  linkMode ? "translate-x-3.5" : "translate-x-0.5",
                )}
              />
            </span>
          </button>
        </div>
      )}

      {hidePreview ? null : current.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={multiple ? "Files in this gallery" : "Current file"}>
          {current.map((url) => (
            <li key={url} className="relative">
              {kind === "audio" || looksLikeAudio(url) ? (
                <span className="flex h-16 w-40 items-center gap-2 rounded-md border border-border bg-muted/40 px-2 text-xs text-muted-foreground">
                  <FileAudio className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{url.split("/").pop()}</span>
                </span>
              ) : looksLikeVideo(url) ? (
                /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url) ? (
                  <video src={url} className="h-24 w-36 rounded-md border border-border bg-black object-cover" muted playsInline />
                ) : (
                  <span className="flex h-24 w-36 flex-col items-center justify-center gap-1 rounded-md border border-border bg-muted/40 px-2 text-center text-xs text-muted-foreground">
                    <Film className="size-5" aria-hidden />
                    <span className="line-clamp-2 break-all">{url.replace(/^https?:\/\//, "")}</span>
                  </span>
                )
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  className={cn(
                    "border border-border bg-muted/30",
                    shape === "round" && cn("size-20 rounded-full object-cover", FACE_SAFE_CROP),
                    shape === "square" && "size-20 rounded-md object-contain p-1",
                    shape === "wide" && cn("h-24 w-36 rounded-md object-cover", FACE_SAFE_CROP),
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => setAll(current.filter((u) => u !== url))}
                disabled={disabled}
                aria-label={`Remove this ${noun}`}
                className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-destructive"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : shape === "round" && fallbackName ? (
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-20 place-items-center rounded-full bg-secondary text-lg font-semibold text-primary">
            {initialsOf(fallbackName)}
          </span>
          <p className="text-xs text-muted-foreground">No photo yet. Initials show until one is added.</p>
        </div>
      ) : null}

      {linkMode ? (
        <div className="flex gap-2">
          <Input
            id={`${id}-link`}
            type="url"
            inputMode="url"
            className="font-mono text-sm"
            placeholder={kind === "video" ? "https://youtube.com/… or https://…/video.mp4" : "https://…"}
            disabled={disabled}
            value={multiple ? linkDraft : props.value ?? ""}
            onChange={(e) => (multiple ? setLinkDraft(e.target.value) : props.onChange(e.target.value))}
            onKeyDown={(e) => {
              if (multiple && e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
          />
          {multiple ? (
            <Button type="button" variant="outline" size="sm" className="h-10 shrink-0" onClick={addLink} disabled={disabled || !canAddMore}>
              <Plus className="mr-1 size-4" aria-hidden /> Add
            </Button>
          ) : null}
        </div>
      ) : null}

      {!linkMode || multiple ? (
        canAddMore ? (
          <button
            id={id}
            type="button"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
            }}
            className={cn(
              "group flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition-colors",
              "border-primary/25 bg-primary/[0.03] text-muted-foreground hover:border-primary/60 hover:bg-primary/[0.06]",
              "dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/15",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-wait disabled:opacity-70",
              dragging && "border-primary bg-primary/10",
              compact ? "py-3" : "py-5",
            )}
          >
            {compact ? null : (
              <span className="relative block h-6 w-32" aria-hidden>
                <ActLogo sizes="128px" />
              </span>
            )}
            <span className="flex items-center gap-2 text-sm font-medium text-primary dark:text-foreground">
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : kind === "video" ? <Film className="size-4" aria-hidden /> : <ImageUp className="size-4" aria-hidden />}
              {busy
                ? "Uploading…"
                : multiple
                  ? `Upload ${noun}s`
                  : current.length
                    ? `Replace ${noun}`
                    : `Upload ${noun}`}
            </span>
            <span className="text-xs">
              Click or drag {multiple ? "files" : "a file"} here
              {hint ? ` · ${hint}` : ""}
            </span>
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">This gallery is full ({max}). Remove a file to add another.</p>
        )
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.currentTarget.files?.length) void upload(e.currentTarget.files);
        }}
      />
      {status ? (
        <p role={status.error ? "alert" : "status"} className={cn("text-xs", status.error ? "text-destructive" : "text-muted-foreground")}>
          {status.text}
        </p>
      ) : null}
    </div>
  );
}
