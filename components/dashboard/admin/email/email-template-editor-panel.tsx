import Link from "next/link";
import { ArrowRight, Newspaper, PencilRuler } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function EmailTemplateEditorPanel() {
  return (
    <div className="space-y-4">
      <Card className="border-border/80">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-heading text-base font-semibold text-primary">Template Editor</p>
          <p className="mt-1">
            Email templates share the same block editor as blog posts, so you get drag-and-drop blocks, the rich-text
            paragraph editor, and inline-styled HTML that renders in every mail client.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/dashboard/admin/email?tab=templates" className="group block rounded-xl">
          <Card className="h-full transition-shadow group-hover:shadow-md">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PencilRuler className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-medium text-primary">Manage templates <ArrowRight className="size-3.5" /></p>
                <p className="truncate text-xs text-muted-foreground">Browse, edit, and deploy saved templates.</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/admin/blog-post" className="group block rounded-xl">
          <Card className="h-full transition-shadow group-hover:shadow-md">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Newspaper className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-medium text-primary">Block builder <ArrowRight className="size-3.5" /></p>
                <p className="truncate text-xs text-muted-foreground">Build content, then “Convert to email template”.</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
