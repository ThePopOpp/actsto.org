import DOMPurify from "isomorphic-dompurify";

/**
 * Shared sanitizer for stored/rendered blog HTML. The block serializer emits
 * inline-styled, email-first markup (rich-text spans with color / font-size /
 * font-family, lists, galleries, audio, and video embeds), so we must preserve
 * `style` / `target` and allow media tags while stripping anything unsafe.
 *
 * Used both on save (server, before persisting `content`) and at public render.
 */

// Only allow video <iframe> embeds from these trusted players. Registered once.
const ALLOWED_IFRAME_HOSTS = ["www.youtube.com", "youtube.com", "player.vimeo.com"];

let hookRegistered = false;
function ensureHook() {
  if (hookRegistered) return;
  hookRegistered = true;
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName !== "iframe") return;
    const el = node as unknown as Element;
    const src = el.getAttribute?.("src") ?? "";
    let ok = false;
    try {
      ok = ALLOWED_IFRAME_HOSTS.includes(new URL(src).host);
    } catch {
      ok = false;
    }
    if (!ok) el.parentNode?.removeChild(el);
  });
}

export function sanitizeBlogHtml(html: string): string {
  ensureHook();
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["style", "target", "allow", "allowfullscreen", "frameborder", "loading", "controls", "preload", "playsinline", "poster"],
  });
}
