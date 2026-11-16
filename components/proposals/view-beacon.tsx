"use client";

import { useEffect } from "react";

/** Counts one view of a link-only proposal page (once per visitor per day, server side). */
export function ProposalViewBeacon({ token }: { token: string }) {
  useEffect(() => {
    void fetch(`/api/p/${encodeURIComponent(token)}/view`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer: document.referrer || null }),
    }).catch(() => undefined);
  }, [token]);
  return null;
}
