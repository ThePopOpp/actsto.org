export const LEGAL_SLUGS = ["privacy", "terms", "communication"] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

export function publicLegalPath(slug: LegalSlug): string {
  if (slug === "communication") return "/legal/communication-policy";
  return `/legal/${slug}`;
}
