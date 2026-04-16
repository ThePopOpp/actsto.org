import Link from "next/link";

import { AdminAppShell } from "@/components/dashboard/admin-app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { isAdminUiPreviewEnabled } from "@/lib/auth/admin-ui-preview";
import type { ActSession } from "@/lib/auth/types";

const PREVIEW_BASE = "/dashboard/admin-preview";

const previewUser: ActSession = {
  email: "preview@local.dev",
  name: "UI preview",
  role: "super_admin",
  roles: [],
};

export default function AdminPreviewLayout({ children }: { children: React.ReactNode }) {
  if (!isAdminUiPreviewEnabled()) {
    return (
      <div className="mx-auto max-w-lg p-6 md:p-10">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-primary">Super Admin preview is disabled</CardTitle>
            <CardDescription>
              The unauthenticated preview at{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">/dashboard/admin-preview</code> is only
              available when preview mode is allowed for this environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Local dev:</strong> run <code className="rounded bg-muted px-1 text-xs">npm run dev</code> (preview is on by default).
            </p>
            <p>
              <strong className="text-foreground">Production build locally</strong> (<code className="rounded bg-muted px-1 text-xs">npm run build</code> then{" "}
              <code className="rounded bg-muted px-1 text-xs">npm run start</code>): set{" "}
              <code className="rounded bg-muted px-1 text-xs">ADMIN_UI_PREVIEW=true</code> in{" "}
              <code className="rounded bg-muted px-1 text-xs">.env</code> and restart.
            </p>
            <p>
              <strong className="text-foreground">Vercel Production:</strong> add{" "}
              <code className="rounded bg-muted px-1 text-xs">ADMIN_UI_PREVIEW=true</code> to project env vars if you need
              this preview there. <strong className="text-foreground">Vercel Preview</strong> deployments enable it
              automatically.
            </p>
            <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Back home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminAppShell user={previewUser} basePath={PREVIEW_BASE} previewMode>
      {children}
    </AdminAppShell>
  );
}
