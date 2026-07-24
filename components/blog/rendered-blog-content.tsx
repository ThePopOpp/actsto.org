import { sanitizeBlogHtml } from "@/lib/blog/sanitize";
import { cn } from "@/lib/utils";

/**
 * Renders stored block HTML (inline-styled, email-first) for the public post
 * page. Sanitized with DOMPurify. The `surface` chrome is chosen per post:
 * - card:    white "paper" panel (default; keeps the serializer's fixed colors
 *            readable in light and dark mode).
 * - outline: bordered, transparent — blends with the page background.
 * - none:    plain, no chrome.
 *
 * The arbitrary-variant classes restore list/paragraph/link/media styling that
 * Tailwind's preflight reset would otherwise strip from the rich-text markup.
 */
export function RenderedBlogContent({ html, surface = "card" }: { html: string; surface?: string }) {
  const clean = sanitizeBlogHtml(html);
  const surfaceClass =
    surface === "none"
      ? "text-foreground"
      : surface === "outline"
        ? "rounded-xl border border-border/70 p-6 text-foreground sm:p-8"
        : "rounded-xl border border-border/70 bg-white p-6 text-[#374151] shadow-sm ring-1 ring-foreground/5 sm:p-8";
  return (
    <div className={cn("overflow-hidden", surfaceClass)}>
      <div
        className="leading-relaxed [&_a]:text-act-red [&_a]:underline [&_blockquote]:my-4 [&_figure]:m-0 [&_h1]:mb-3 [&_h1]:font-heading [&_h2]:mb-3 [&_h2]:font-heading [&_h3]:mb-2 [&_h3]:font-heading [&_iframe]:w-full [&_img]:max-w-full [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </div>
  );
}
