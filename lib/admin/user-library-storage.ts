import type { AdminUserSample } from "@/lib/admin/mock-users";

const STORAGE_KEY = "act-admin-user-rows-v1";

export function loadAdminUserRows(): AdminUserSample[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as AdminUserSample[];
  } catch {
    return null;
  }
}

export function saveAdminUserRows(rows: AdminUserSample[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* quota */
  }
}

export function removeAdminUserRow(rows: AdminUserSample[], id: string): AdminUserSample[] {
  return rows.filter((r) => r.id !== id);
}

/** Replace row `oldId` and enforce unique email (case-insensitive). */
export function upsertAdminUserRow(
  rows: AdminUserSample[],
  user: AdminUserSample,
  oldId: string | null
): AdminUserSample[] {
  const emailLc = user.email.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (oldId && r.id === oldId) return false;
    if (!oldId && r.email.toLowerCase() === emailLc) return false;
    if (oldId && r.id !== oldId && r.email.toLowerCase() === emailLc) return false;
    return true;
  });
  return [...filtered, user];
}
