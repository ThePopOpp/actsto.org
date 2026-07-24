/**
 * Block-editor document model for blog posts + email templates, and the
 * block → HTML serializer. Framework-agnostic (no server-only / no React) so it
 * can be used by the client editor, the API (to serialize + sanitize on save),
 * and server rendering.
 */

export type BlogBlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "video"
  | "quote"
  | "code"
  | "button"
  | "divider"
  | "spacer"
  | "columns"
  | "columns3"
  | "columns4";

export type BlogBlockProps = {
  level?: "h1" | "h2" | "h3";
  content?: string;
  align?: "left" | "center" | "right";
  color?: string;
  src?: string;
  alt?: string;
  caption?: string;
  linkUrl?: string;
  imgWidth?: string;
  videoUrl?: string;
  author?: string;
  language?: string;
  buttonText?: string;
  buttonUrl?: string;
  buttonBgColor?: string;
  buttonColor?: string;
  height?: number;
  col1?: string;
  col2?: string;
  col3?: string;
  col4?: string;
  colGap?: number;
  bgColor?: string;
  // Section spacing (inspector).
  marginTop?: number;
  marginBottom?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingSide?: number;
};

export type BlogBlock = {
  id: string;
  type: BlogBlockType;
  props: BlogBlockProps;
};

export type BlogBlockDef = {
  type: BlogBlockType;
  label: string;
  /** lucide-react icon name resolved in the editor */
  icon: string;
  defaults: BlogBlockProps;
};

export const BLOG_BLOCK_DEFS: BlogBlockDef[] = [
  { type: "heading", label: "Heading", icon: "Heading", defaults: { level: "h2", content: "Section heading", align: "left" } },
  { type: "paragraph", label: "Paragraph", icon: "Pilcrow", defaults: { content: "Write your paragraph here…", align: "left" } },
  { type: "image", label: "Image", icon: "Image", defaults: { src: "", alt: "", caption: "", imgWidth: "100%", align: "center" } },
  { type: "video", label: "Video", icon: "Video", defaults: { videoUrl: "", caption: "" } },
  { type: "quote", label: "Quote", icon: "Quote", defaults: { content: "A memorable quote.", author: "", align: "left" } },
  { type: "button", label: "Button", icon: "MousePointerClick", defaults: { buttonText: "Learn more", buttonUrl: "/", buttonBgColor: "#1e2a4a", buttonColor: "#ffffff", align: "left" } },
  { type: "columns", label: "2 Columns", icon: "Columns2", defaults: { col1: "Left column text.", col2: "Right column text.", colGap: 24 } },
  { type: "columns3", label: "3 Columns", icon: "Columns3", defaults: { col1: "Column one.", col2: "Column two.", col3: "Column three.", colGap: 20 } },
  { type: "columns4", label: "4 Columns", icon: "Columns4", defaults: { col1: "One.", col2: "Two.", col3: "Three.", col4: "Four.", colGap: 16 } },
  { type: "code", label: "Code", icon: "Code", defaults: { content: "// code", language: "text" } },
  { type: "divider", label: "Divider", icon: "Minus", defaults: {} },
  { type: "spacer", label: "Spacer", icon: "MoveVertical", defaults: { height: 32 } },
];

export function blockDefaults(type: BlogBlockType): BlogBlockProps {
  return { ...(BLOG_BLOCK_DEFS.find((d) => d.type === type)?.defaults ?? {}) };
}

/** Deterministic id generator (avoids Math.random hydration drift when possible). */
export function newBlockId(seed: number): string {
  return `b${seed.toString(36)}${(seed * 2654435761 % 1000).toString(36)}`;
}

function esc(value: string | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Allow inline formatting the editor produces (b/i/a/br) while escaping the rest. */
function inline(value: string | undefined): string {
  const raw = value ?? "";
  // Escape everything, then re-allow a small safe set of inline tags.
  let out = esc(raw);
  out = out
    .replace(/&lt;(\/?)(b|strong|i|em|u|br)&gt;/gi, "<$1$2>")
    .replace(/&lt;a href=&quot;([^"']+)&quot;&gt;/gi, (_m, href) => `<a href="${esc(href)}" style="color:#a93226;">`)
    .replace(/&lt;\/a&gt;/gi, "</a>");
  return out.replace(/\n/g, "<br>");
}

function align(a: string | undefined): string {
  return a === "center" ? "center" : a === "right" ? "right" : "left";
}

/** Serialize a single block to inline-styled HTML (email-client friendly). */
export function blockToHtml(block: BlogBlock): string {
  const p = block.props;
  const num = (v: number | undefined, fallback: number) => (typeof v === "number" ? v : fallback);
  const wrap = (inner: string) => {
    const mt = num(p.marginTop, 0);
    const mb = num(p.marginBottom, 20);
    const padded = p.bgColor ? 16 : 0;
    const pt = num(p.paddingTop, padded);
    const pb = num(p.paddingBottom, padded);
    const px = num(p.paddingSide, padded);
    const bg = p.bgColor ? `background:${esc(p.bgColor)};` : "";
    const radius = p.bgColor ? "border-radius:10px;" : "";
    return `<div style="margin:${mt}px 0 ${mb}px;padding:${pt}px ${px}px ${pb}px;${bg}${radius}">${inner}</div>`;
  };

  switch (block.type) {
    case "heading": {
      const size = p.level === "h1" ? 34 : p.level === "h3" ? 20 : 26;
      const tag = p.level ?? "h2";
      return wrap(
        `<${tag} style="margin:0;font-family:Georgia,serif;font-weight:600;font-size:${size}px;line-height:1.2;color:${esc(p.color) || "#1e2a4a"};text-align:${align(p.align)};">${inline(p.content)}</${tag}>`,
      );
    }
    case "paragraph":
      return wrap(
        `<p style="margin:0;font-size:16px;line-height:1.7;color:${esc(p.color) || "#374151"};text-align:${align(p.align)};">${inline(p.content)}</p>`,
      );
    case "image": {
      if (!p.src) return wrap(`<div style="padding:32px;text-align:center;color:#9ca3af;border:1px dashed #d1d5db;border-radius:10px;">No image set</div>`);
      const img = `<img src="${esc(p.src)}" alt="${esc(p.alt)}" style="max-width:${esc(p.imgWidth) || "100%"};width:${esc(p.imgWidth) || "100%"};height:auto;border-radius:10px;display:inline-block;" />`;
      const linked = p.linkUrl ? `<a href="${esc(p.linkUrl)}">${img}</a>` : img;
      const cap = p.caption ? `<div style="margin-top:8px;font-size:13px;color:#6b7280;">${inline(p.caption)}</div>` : "";
      return wrap(`<div style="text-align:${align(p.align) || "center"};">${linked}${cap}</div>`);
    }
    case "video": {
      const url = p.videoUrl ?? "";
      if (!url) return wrap(`<div style="padding:32px;text-align:center;color:#9ca3af;border:1px dashed #d1d5db;border-radius:10px;">No video URL</div>`);
      const cap = p.caption ? `<div style="margin-top:8px;font-size:13px;color:#6b7280;text-align:center;">${inline(p.caption)}</div>` : "";
      return wrap(
        `<div style="text-align:center;"><a href="${esc(url)}" style="color:#a93226;">▶ Watch video</a>${cap}</div>`,
      );
    }
    case "quote":
      return wrap(
        `<blockquote style="margin:0;padding:8px 20px;border-left:4px solid #a93226;font-family:Georgia,serif;font-style:italic;font-size:19px;line-height:1.5;color:#1e2a4a;text-align:${align(p.align)};">${inline(p.content)}${p.author ? `<footer style="margin-top:8px;font-size:14px;font-style:normal;color:#6b7280;">— ${inline(p.author)}</footer>` : ""}</blockquote>`,
      );
    case "code":
      return wrap(
        `<pre style="margin:0;padding:16px;background:#0b1220;color:#e5e7eb;border-radius:10px;overflow:auto;font-size:13px;line-height:1.5;"><code>${esc(p.content)}</code></pre>`,
      );
    case "button": {
      const href = p.buttonUrl || "/";
      return wrap(
        `<div style="text-align:${align(p.align)};"><a href="${esc(href)}" style="display:inline-block;padding:12px 26px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;background:${esc(p.buttonBgColor) || "#1e2a4a"};color:${esc(p.buttonColor) || "#ffffff"};">${inline(p.buttonText) || "Button"}</a></div>`,
      );
    }
    case "divider":
      return wrap(`<hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />`);
    case "spacer":
      return `<div style="height:${Number(p.height) || 32}px;" aria-hidden="true"></div>`;
    case "columns":
    case "columns3":
    case "columns4": {
      const cols = block.type === "columns" ? [p.col1, p.col2] : block.type === "columns3" ? [p.col1, p.col2, p.col3] : [p.col1, p.col2, p.col3, p.col4];
      const gap = Number(p.colGap) || 20;
      const width = `${(100 / cols.length).toFixed(4)}%`;
      const cells = cols
        .map(
          (c) =>
            `<td style="vertical-align:top;padding:0 ${gap / 2}px;width:${width};"><div style="font-size:15px;line-height:1.6;color:#374151;">${inline(c)}</div></td>`,
        )
        .join("");
      return wrap(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>${cells}</tr></table>`,
      );
    }
    default:
      return "";
  }
}

/** Serialize a block document to a single HTML string. */
export function blocksToHtml(blocks: BlogBlock[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";
  return blocks.map(blockToHtml).join("\n");
}

/** Narrowing helper for JSON coming out of the DB / request bodies. */
export function coerceBlocks(value: unknown): BlogBlock[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (b): b is BlogBlock =>
      Boolean(b) && typeof b === "object" && typeof (b as BlogBlock).type === "string",
  );
}
