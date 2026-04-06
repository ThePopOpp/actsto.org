/** Rewrite hrefs from the canonical admin route to a preview base (e.g. /dashboard/admin-preview). */
export function adminHrefForBase(fullHref: string, basePath: string): string {
  const b = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  if (fullHref === "/dashboard/admin") return b;
  return fullHref.replace("/dashboard/admin", b);
}
