"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LegalWysiwygEditor } from "@/components/dashboard/admin/legal-wysiwyg-editor";
import type { LegalSlug } from "@/lib/legal/slug";
import { cn } from "@/lib/utils";

const TABS: { slug: LegalSlug; label: string }[] = [
  { slug: "terms", label: "Terms of Service" },
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "communication", label: "Communication Policy" },
];

export function AdminLegalClient() {
  const [tab, setTab] = useState<LegalSlug>("terms");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((t) => (
          <Button
            key={t.slug}
            type="button"
            variant={tab === t.slug ? "default" : "ghost"}
            size="sm"
            className={cn(tab === t.slug && "shadow-sm")}
            onClick={() => setTab(t.slug)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <LegalWysiwygEditor key={tab} slug={tab} />
    </div>
  );
}
