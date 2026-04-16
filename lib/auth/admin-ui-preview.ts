/**
 * Unauthenticated Super Admin UI preview (e.g. /dashboard/admin-preview).
 * Enabled when:
 * - `NODE_ENV === "development"` (e.g. `npm run dev`), or
 * - `VERCEL_ENV === "preview"` (Vercel Preview deployments), or
 * - `ADMIN_UI_PREVIEW=true` (opt-in for production / `next start` / non-Vercel hosts).
 */
export function isAdminUiPreviewEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.VERCEL_ENV === "preview") return true;
  return process.env.ADMIN_UI_PREVIEW === "true";
}

/**
 * Parent / student / donor / business dashboard previews use the same gate as
 * {@link isAdminUiPreviewEnabled} (`ADMIN_UI_PREVIEW=true` outside development).
 */
export function isDashboardPreviewEnabled(): boolean {
  return isAdminUiPreviewEnabled();
}
