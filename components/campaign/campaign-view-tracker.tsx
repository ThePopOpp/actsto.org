"use client";

import { useEffect, useRef } from "react";

/**
 * Records one page view per visitor per day.
 *
 * Renders nothing. Fires once on mount, and a ref guards against React's
 * development double-invoke — the server de-duplicates anyway, but sending two
 * requests per load is wasteful.
 */
export function CampaignViewTracker({ slug }: { slug: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // keepalive so the request survives a visitor navigating straight away.
    void fetch(`/api/campaigns/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      // Analytics is never worth surfacing an error to a visitor.
    });
  }, [slug]);

  return null;
}
