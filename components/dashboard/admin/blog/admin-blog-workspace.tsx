"use client";

import { useState } from "react";
import { LayoutList, PenSquare } from "lucide-react";

import { BlogBuilder } from "@/components/dashboard/admin/blog/blog-builder";
import { BlogPostsManager } from "@/components/dashboard/admin/blog/blog-posts-manager";
import { cn } from "@/lib/utils";

export function AdminBlogWorkspace() {
  const [tab, setTab] = useState<"posts" | "new">("posts");

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
        {([
          { id: "posts", label: "Blog Posts", Icon: LayoutList },
          { id: "new", label: "New Post", Icon: PenSquare },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <t.Icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "posts" ? <BlogPostsManager onNewPost={() => setTab("new")} /> : <BlogBuilder />}
    </div>
  );
}
