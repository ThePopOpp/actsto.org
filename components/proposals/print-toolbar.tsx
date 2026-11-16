"use client";

import { useEffect } from "react";

/** Screen-only bar on the print view; opens the print dialog once fonts are ready. */
export function PrintToolbar({ backHref }: { backHref: string }) {
  useEffect(() => {
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) window.print();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="no-print mx-auto mb-4 flex w-[816px] max-w-full items-center justify-between gap-3 px-2 text-sm">
      <a href={backHref} className="text-neutral-700 underline underline-offset-2">
        ← Back to the dashboard
      </a>
      <span className="text-neutral-600">Letter, no margins. Turn on &quot;Background graphics&quot; if colors are missing.</span>
      <button type="button" onClick={() => window.print()} className="rounded-md bg-[#091b36] px-4 py-2 font-semibold text-white">
        Print / Save as PDF
      </button>
    </div>
  );
}
