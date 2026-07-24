import DOMPurify from "isomorphic-dompurify";

/**
 * Shared sanitizer for stored/rendered blog HTML. The block serializer emits
 * inline-styled, email-first markup (including rich-text spans with color /
 * font-size / font-family and lists from the paragraph editor), so we must
 * preserve `style` and `target` while stripping anything unsafe.
 *
 * Used both on save (server, before persisting `content`) and at public render.
 */
export function sanitizeBlogHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["style", "target"],
  });
}
