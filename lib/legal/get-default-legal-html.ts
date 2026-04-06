import { GENERATED_DEFAULT_LEGAL_HTML } from "@/lib/legal/generated-default-html";
import type { LegalSlug } from "@/lib/legal/slug";

export function getCachedDefaultLegalHtml(slug: LegalSlug): string {
  return GENERATED_DEFAULT_LEGAL_HTML[slug];
}
