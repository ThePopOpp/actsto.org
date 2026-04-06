import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { WordPressPost } from "@/lib/blog/posts";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&rsquo;/g, "'").replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"').trim();
}

export function BlogPostCard({ post }: { post: WordPressPost }) {
  const img = post.featured_media_embed;
  const excerpt = post.excerptPlain || stripHtml(post.excerpt.rendered);
  const dateLabel = format(new Date(post.date), "MMMM d, yyyy");

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border/80 transition-shadow hover:shadow-md">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
        {img ? (
          <Image
            src={img.source_url}
            alt={img.alt_text}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">No featured image</div>
        )}
      </Link>
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Calendar className="size-3.5 shrink-0" aria-hidden />
            <time dateTime={post.date}>{dateLabel}</time>
          </span>
          <span aria-hidden>·</span>
          <span className="font-medium text-primary">{post.author_embed?.name ?? "ACT"}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {post.terms.category.map((c) => (
            <Badge key={c.id} variant="secondary" className="text-[10px] font-normal uppercase tracking-wide">
              {c.name}
            </Badge>
          ))}
        </div>
        <Link href={`/blog/${post.slug}`}>
          <h2 className="font-heading text-lg font-semibold text-primary transition-colors group-hover:text-act-red">
            {post.title.rendered}
          </h2>
        </Link>
        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{excerpt}</p>
        <Link
          href={`/blog/${post.slug}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 h-8 gap-1 self-start px-2 text-primary hover:text-act-red"
          )}
        >
          Read article
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
