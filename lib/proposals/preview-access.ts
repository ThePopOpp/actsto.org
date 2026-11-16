import "server-only";

import { notFound } from "next/navigation";

import { getActSession } from "@/lib/auth/session-server";
import { KNOWN_PROPOSAL_KEYS } from "@/lib/proposals/admin-api";
import { getOrCreateProposal } from "@/lib/proposals/server";

/**
 * The admin-only views under /p/preview/<key> (landing preview, print, present).
 * They live outside /dashboard so they render without the admin shell, and
 * 404 for anyone who isn't a Super Admin, whether or not the link is live.
 */
export async function requirePreviewAccess(key: string) {
  const session = await getActSession().catch(() => null);
  if (session?.role !== "super_admin") notFound();
  if (!(KNOWN_PROPOSAL_KEYS as readonly string[]).includes(key)) notFound();
  return getOrCreateProposal(key);
}

export const PREVIEW_METADATA = {
  robots: { index: false, follow: false },
} as const;
