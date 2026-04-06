import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function CampaignBreadcrumbs({
  category,
  title,
}: {
  category?: string;
  title: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
        </li>
        <ChevronRight className="size-3.5 shrink-0 opacity-40" aria-hidden />
        <li>
          <Link href="/campaigns" className="transition-colors hover:text-foreground">
            Campaigns
          </Link>
        </li>
        {category ? (
          <>
            <ChevronRight className="size-3.5 shrink-0 opacity-40" aria-hidden />
            <li className="text-muted-foreground/90">{category}</li>
          </>
        ) : null}
        <ChevronRight className="size-3.5 shrink-0 opacity-40" aria-hidden />
        <li
          className="max-w-[min(100%,320px)] truncate font-medium text-foreground"
          aria-current="page"
        >
          {title}
        </li>
      </ol>
    </nav>
  );
}
