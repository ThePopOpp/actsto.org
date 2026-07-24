import DOMPurify from "isomorphic-dompurify";

/**
 * Renders stored block HTML (inline-styled, email-first) for the public post
 * page. Sanitized with DOMPurify. Wrapped on a white "paper" surface so the
 * block serializer's fixed colors stay readable in both light and dark mode.
 */
export function RenderedBlogContent({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["style", "target"],
  });
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-white p-6 shadow-sm ring-1 ring-foreground/5 sm:p-8">
      <div className="mx-auto max-w-2xl [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: clean }} />
    </div>
  );
}
