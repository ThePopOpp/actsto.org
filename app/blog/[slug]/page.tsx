import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Calendar, FolderOpen, Tag, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/lib/button-variants";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog/posts";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  const title = post.meta._yoast_wpseo_title ?? post.title.rendered;
  const description = post.meta._yoast_wpseo_metadesc ?? post.excerptPlain;
  return {
    title: post.title.rendered,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.modified,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const published = format(new Date(post.date), "MMMM d, yyyy");
  const modified = format(new Date(post.modified), "MMMM d, yyyy");
  const img = post.featured_media_embed;

  return (
    <>
      <article className="border-b border-border/60 bg-gradient-to-b from-act-banner/30 to-background dark:from-act-banner/10">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <nav className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2" aria-hidden>
              /
            </span>
            <Link href="/blog" className="hover:text-primary">
              Blog
            </Link>
            <span className="mx-2" aria-hidden>
              /
            </span>
            <span className="text-foreground">{post.title.rendered}</span>
          </nav>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-normal">
              {post.type}
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {post.status}
            </Badge>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Calendar className="size-3.5" aria-hidden />
              <time dateTime={post.date}>Published {published}</time>
            </span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">Updated {modified}</span>
          </div>

          <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-primary sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            {post.title.rendered}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{post.excerptPlain}</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <User className="size-4 shrink-0 text-primary" aria-hidden />
              <span>
                Author:{" "}
                <span className="font-medium text-foreground">{post.author_embed?.name ?? `User #${post.author}`}</span>
                {post.author_embed ? (
                  <span className="ml-1 font-mono text-xs">({post.author_embed.slug})</span>
                ) : null}
              </span>
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
              <FolderOpen className="size-3.5" aria-hidden />
              Categories
            </span>
            {post.terms.category.map((c) => (
              <Badge key={c.id} variant="secondary">
                {c.name}
              </Badge>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
              <Tag className="size-3.5" aria-hidden />
              Tags
            </span>
            {post.terms.post_tag.map((t) => (
              <Badge key={t.id} variant="outline">
                {t.name}
              </Badge>
            ))}
          </div>
        </div>
      </article>

      {img ? (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-border/80 bg-muted shadow-sm ring-1 ring-foreground/5">
            <Image
              src={img.source_url}
              alt={img.alt_text}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Featured media ID {post.featured_media} · {img.mime_type}
            {img.media_details ? ` · ${img.media_details.width}×${img.media_details.height}` : null}
          </p>
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-none">
          <div className="space-y-8 text-base leading-relaxed">
            {post.contentSections.map((section, i) => (
              <section key={i} className="space-y-4">
                {section.heading ? (
                  <h2 className="font-heading text-xl font-semibold text-primary sm:text-2xl">{section.heading}</h2>
                ) : null}
                {section.paragraphs.map((p, j) => (
                  <p key={j} className="text-muted-foreground">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>

        <Separator className="my-12" />

        <Card className="border-border/80 bg-muted/20">
          <CardHeader>
            <CardTitle className="font-heading text-base text-primary">WordPress-style metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 font-mono text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <span className="text-foreground">id</span> · {post.id}
            </div>
            <div>
              <span className="text-foreground">slug</span> · {post.slug}
            </div>
            <div>
              <span className="text-foreground">date</span> · {post.date}
            </div>
            <div>
              <span className="text-foreground">date_gmt</span> · {post.date_gmt}
            </div>
            <div>
              <span className="text-foreground">modified</span> · {post.modified}
            </div>
            <div>
              <span className="text-foreground">modified_gmt</span> · {post.modified_gmt}
            </div>
            <div>
              <span className="text-foreground">author</span> · {post.author}
            </div>
            <div>
              <span className="text-foreground">featured_media</span> · {post.featured_media}
            </div>
            <div className="sm:col-span-2">
              <span className="text-foreground">categories</span> · [{post.categories.join(", ")}]
            </div>
            <div className="sm:col-span-2">
              <span className="text-foreground">tags</span> · [{post.tags.join(", ")}]
            </div>
            {post.meta._yoast_wpseo_canonical ? (
              <div className="sm:col-span-2 break-all">
                <span className="text-foreground">_yoast_wpseo_canonical</span> · {post.meta._yoast_wpseo_canonical}
              </div>
            ) : null}
            {post.meta._yoast_wpseo_focuskw ? (
              <div className="sm:col-span-2">
                <span className="text-foreground">_yoast_wpseo_focuskw</span> · {post.meta._yoast_wpseo_focuskw}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/blog" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
            ← All articles
          </Link>
          <Link href="/campaigns" className={cn(buttonVariants(), "gap-2")}>
            Support a campaign
          </Link>
        </div>
      </div>
    </>
  );
}
