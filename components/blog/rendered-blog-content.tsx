import { sanitizeBlogHtml } from "@/lib/blog/sanitize";

/**
 * Renders stored block HTML (inline-styled, email-first) for the public post
 * page. Sanitized with DOMPurify. Wrapped on a white "paper" surface so the
 * block serializer's fixed colors stay readable in both light and dark mode.
 *
 * The arbitrary-variant classes restore list/paragraph/link styling that
 * Tailwind's preflight reset would otherwise strip from the rich-text markup.
 */
export function RenderedBlogContent({ html }: { html: string }) {
  const clean = sanitizeBlogHtml(html);
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-white p-6 text-[#374151] shadow-sm ring-1 ring-foreground/5 sm:p-8">
      <div
        className="mx-auto max-w-2xl leading-relaxed [&_a]:text-act-red [&_a]:underline [&_blockquote]:my-4 [&_h1]:mb-3 [&_h1]:font-heading [&_h2]:mb-3 [&_h2]:font-heading [&_h3]:mb-2 [&_h3]:font-heading [&_img]:max-w-full [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </div>
  );
}
