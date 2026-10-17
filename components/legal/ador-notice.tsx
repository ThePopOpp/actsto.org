import Link from "next/link";

import { ADOR_REQUIRED_NOTICE, AWARD_SUMMARY_PATH } from "@/lib/award-policy/public-page";
import { cn } from "@/lib/utils";

/**
 * The notice ADOR requires, word for word, on the home page, the scholarship
 * application and every donation page, with a link to how we award
 * scholarships. Works in server and client components.
 */
export function AdorNotice({ className, showLink = true }: { className?: string; showLink?: boolean }) {
  return (
    <aside
      aria-label="Required notice"
      className={cn("rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground", className)}
    >
      {ADOR_REQUIRED_NOTICE.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {showLink ? (
        <p className="mt-1">
          <Link href={AWARD_SUMMARY_PATH} className="font-medium text-primary underline-offset-4 hover:underline">
            How we award scholarships
          </Link>
        </p>
      ) : null}
    </aside>
  );
}
