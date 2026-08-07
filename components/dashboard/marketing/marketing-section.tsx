import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A collapsible section of a marketing builder.
 *
 * Native `<details>` rather than a JS accordion: it works without hydration, is
 * keyboard-navigable for free, and browser in-page search can find text inside a
 * closed section — which matters on a page with this many fields.
 *
 * Only the first section opens by default. The builders are long enough that
 * showing everything at once buries the preview.
 */
export function MarketingSection({
  title,
  description,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-xl px-5 py-4 transition-colors marker:content-none hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-heading text-lg font-semibold text-primary">{title}</span>
          {description ? (
            <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-border/60 px-5 py-4">{children}</div>
    </details>
  );
}
