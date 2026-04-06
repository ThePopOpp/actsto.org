/**
 * Unauthenticated Super Admin UI preview (e.g. /dashboard/admin-preview).
 * Enabled in development, or in any environment when ADMIN_UI_PREVIEW=true.
 */
export function isAdminUiPreviewEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.ADMIN_UI_PREVIEW === "true";
}

/**
 * Parent / student / donor / business dashboard previews use the same gate as
 * {@link isAdminUiPreviewEnabled} (`ADMIN_UI_PREVIEW=true` outside development).
 */
export function isDashboardPreviewEnabled(): boolean {
  return isAdminUiPreviewEnabled();
}
