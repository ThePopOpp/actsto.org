"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import { cn, formatLongDate, parseDateValue } from "@/lib/utils";

/**
 * Navy panel with white cells.
 *
 * Fixed brand navy rather than `bg-primary`, because `primary` flips to
 * near-white in dark mode and would take the white number cells with it. The
 * panel reads the same in both themes, which is what a countdown wants.
 */
const PANEL = "rounded-lg bg-[var(--act-brand-navy-dark)] text-white";

/**
 * Live countdown to a campaign's end date.
 *
 * Deliberate about hydration: `now` starts null, so the server and the first
 * client paint both render the static "N days left" line. Once mounted it
 * upgrades to a ticking clock. That avoids a hydration mismatch without hiding
 * the deadline behind a spinner, and it degrades to something useful if JS
 * never runs.
 *
 * Note this is a *fundraising* deadline, where urgency is the point — unlike the
 * scholarship application window, which deliberately shows a date and no timer.
 * A family being pressured into a tuition application is a different thing from
 * a donor being reminded a campaign is closing.
 */
export function CampaignCountdown({
  endDate,
  daysLeft,
}: {
  endDate: string | null;
  /** Server-computed, used until the clock takes over. */
  daysLeft: number;
}) {
  const target = parseDateValue(endDate);
  // End of the closing day, not midnight at its start — a campaign ending on the
  // 31st runs through the 31st.
  const deadline = target
    ? new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999)
    : null;

  const [now, setNow] = useState<number | null>(null);

  // A primitive dependency: `deadline` is a fresh Date on every render, so
  // depending on the object would restart the interval each second.
  const deadlineMs = deadline?.getTime() ?? null;

  useEffect(() => {
    if (deadlineMs === null) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 1000);
    // First tick on the next frame rather than synchronously, so this stays out
    // of the render pass.
    const raf = window.requestAnimationFrame(tick);
    return () => {
      window.clearInterval(id);
      window.cancelAnimationFrame(raf);
    };
  }, [deadlineMs]);

  if (!deadline) return null;

  const remaining = now === null ? null : Math.max(0, deadline.getTime() - now);
  const ended = remaining !== null && remaining === 0;

  if (ended) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        <Clock className="size-3.5 shrink-0" aria-hidden />
        This campaign closed on {formatLongDate(endDate)}.
      </div>
    );
  }

  // Pre-hydration, and if JS is off: the deadline as a plain sentence, in the
  // same navy panel so it doesn't change colour when the clock takes over.
  if (remaining === null) {
    return (
      <div className={cn(PANEL, "flex items-center justify-center gap-2 px-3 py-3 text-xs")}>
        <Clock className="size-3.5 shrink-0" aria-hidden />
        Campaign ends {formatLongDate(endDate)} · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
      </div>
    );
  }

  const seconds = Math.floor(remaining / 1000);
  const parts = [
    { label: "Days", value: Math.floor(seconds / 86400) },
    { label: "Hours", value: Math.floor((seconds % 86400) / 3600) },
    { label: "Mins", value: Math.floor((seconds % 3600) / 60) },
    { label: "Secs", value: seconds % 60 },
  ];

  return (
    <div className={cn(PANEL, "p-3")}>
      <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium">
        <Clock className="size-3.5 shrink-0" aria-hidden />
        Campaign ends {formatLongDate(endDate)}
      </p>

      {/* One polite announcement of the whole remaining time, rather than a
          screen reader reading four numbers change every second. */}
      <p className="sr-only" role="status" aria-live="polite">
        {parts[0].value} days, {parts[1].value} hours and {parts[2].value} minutes remaining.
      </p>

      <div aria-hidden className="grid grid-cols-4 gap-1.5">
        {parts.map((part) => (
          <div key={part.label} className="rounded-md bg-white py-1.5 text-center">
            {/* Explicit colours, not the theme tokens: these cells are always
                white, so `text-primary` would go near-invisible in dark mode. */}
            <p className="font-heading text-lg font-semibold tabular-nums text-[#001138]">
              {String(part.value).padStart(2, "0")}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {part.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
