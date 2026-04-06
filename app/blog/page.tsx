import type { Metadata } from "next";
import { Newspaper } from "lucide-react";

import { BlogArchiveCta } from "@/components/blog/blog-archive-cta";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import { getPublishedPosts } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Articles on Arizona private school tax credits, tuition campaigns, giving through ACT, and faith-centered education in the Valley.",
};

export default function BlogArchivePage() {
  const posts = getPublishedPosts();

  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-act-banner/40 to-background dark:from-act-banner/10">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-border/80 bg-card px-4 py-1.5 text-xs font-medium text-primary shadow-xs">
              <Newspaper className="size-3.5" aria-hidden />
              News &amp; insights
            </span>
            <h1 className="mt-6 font-heading text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
              Arizona Christian Tuition blog
            </h1>
            <p className="mx-auto mt-5 text-lg leading-relaxed text-muted-foreground">
              Practical guidance for families, donors, and schools—aligned with Arizona&rsquo;s tax credit scholarship
              programs and how we serve the Valley.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <p className="mb-8 text-sm text-muted-foreground">
          Showing {posts.length} articles · Content mirrors WordPress <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">post</code> fields
          (<span className="whitespace-nowrap">type, status, date, author, featured_media, terms, meta</span>).
        </p>
        <div className="grid gap-8 sm:grid-cols-2">
          {posts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <BlogArchiveCta />
    </>
  );
}
