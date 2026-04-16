"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ActSession, PortalRole } from "@/lib/auth/types";
import { PORTAL_SWITCHER_LABEL, PORTAL_SWITCHER_ORDER } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

export function PortalAccountSwitcher({
  session,
  layout = "full",
}: {
  session: ActSession;
  /** `sidebar`: compact column for left rail. `full`: legacy full-width bar. */
  layout?: "full" | "sidebar";
}) {
  const [pending, setPending] = useState<PortalRole | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  if (session.roles.length <= 1) {
    return null;
  }

  const tabs = PORTAL_SWITCHER_ORDER.filter((r) => session.roles.includes(r));

  async function switchPortal(role: PortalRole) {
    if (role === session.role) return;
    setSwitchError(null);
    setPending(role);
    try {
      const res = await fetch("/api/auth/switch-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json()) as { error?: string; redirect?: string };
      if (!res.ok) {
        setPending(null);
        setSwitchError(data.error ?? "Could not switch account.");
        return;
      }
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
    } catch {
      setPending(null);
      setSwitchError("Network error. Try again.");
    }
  }

  const tabList = (
    <div
      className={cn("flex gap-1.5", layout === "sidebar" ? "flex-col" : "flex-wrap")}
      role="tablist"
      aria-label="Switch dashboard account type"
    >
      {tabs.map((r) => {
        const active = session.role === r;
        return (
          <Button
            key={r}
            type="button"
            role="tab"
            aria-selected={active}
            size="sm"
            variant={active ? "default" : "outline"}
            disabled={pending !== null}
            className={cn(
              "h-8 rounded-full px-3 text-xs font-medium",
              layout === "sidebar" && "w-full justify-start rounded-lg",
              active && "pointer-events-none"
            )}
            onClick={() => void switchPortal(r)}
          >
            {pending === r ? "…" : PORTAL_SWITCHER_LABEL[r]}
          </Button>
        );
      })}
    </div>
  );

  if (layout === "sidebar") {
    return (
      <div className="border-b border-border bg-muted/30 px-3 py-3">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Account</p>
        <div className="mt-2">{tabList}</div>
        {switchError ? <p className="mt-2 text-xs text-destructive">{switchError}</p> : null}
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-muted/25 px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:shrink-0">
          Account
        </p>
        {tabList}
        {switchError ? (
          <p className="text-xs text-destructive sm:ml-auto sm:max-w-xs sm:text-right">{switchError}</p>
        ) : null}
      </div>
    </div>
  );
}
