"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SLIDES, SLIDE_SIZE } from "@/components/proposals/musk-scholars-fund/deck-slides";
import { BROWSER_FONTS, BROWSER_LOGOS } from "@/components/proposals/musk-scholars-fund/design";
import type { Signer } from "@/lib/proposals/musk-scholars-fund/content";

/**
 * Present the deck: the 1920×1080 slide scaled to fit the window, with
 * ←/→, Space, PageUp/PageDown, Home/End, F for full screen and Esc to leave it.
 */
export function DeckPresenter({ signer, backHref }: { signer: Signer; backHref: string }) {
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(0.5);
  const [chrome, setChrome] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const last = SLIDES.length - 1;

  const go = useCallback((next: number) => setIndex(Math.max(0, Math.min(last, next))), [last]);
  const fullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / SLIDE_SIZE.width, window.innerHeight / SLIDE_SIZE.height));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        setIndex((i) => Math.min(last, i + 1));
      } else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Home") setIndex(0);
      else if (e.key === "End") setIndex(last);
      else if (e.key === "f" || e.key === "F") fullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, fullscreen]);

  // Hide the controls after a moment without the mouse moving.
  useEffect(() => {
    let timer = setTimeout(() => setChrome(false), 2500);
    const show = () => {
      setChrome(true);
      clearTimeout(timer);
      timer = setTimeout(() => setChrome(false), 2500);
    };
    window.addEventListener("mousemove", show);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", show);
    };
  }, []);

  const props = { fonts: BROWSER_FONTS, logos: BROWSER_LOGOS, signer };

  return (
    <div
      ref={stage}
      className="fixed inset-0 flex select-none items-center justify-center overflow-hidden bg-black"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button,a")) return;
        go(e.clientX > window.innerWidth / 3 ? index + 1 : index - 1);
      }}
    >
      <div style={{ width: SLIDE_SIZE.width * scale, height: SLIDE_SIZE.height * scale }}>
        <div style={{ width: SLIDE_SIZE.width, height: SLIDE_SIZE.height, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {SLIDES[index](props)}
        </div>
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent px-5 py-4 text-sm text-white transition-opacity ${
          chrome ? "opacity-100" : "opacity-0"
        }`}
      >
        <a href={backHref} className="underline underline-offset-2">
          ← Dashboard
        </a>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className="rounded bg-white/15 px-3 py-1.5 hover:bg-white/25">
            ←
          </button>
          <span className="tabular-nums" aria-live="polite">
            {index + 1} / {SLIDES.length}
          </span>
          <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className="rounded bg-white/15 px-3 py-1.5 hover:bg-white/25">
            →
          </button>
        </div>
        <button type="button" onClick={fullscreen} className="rounded bg-white/15 px-3 py-1.5 hover:bg-white/25">
          Full screen (F)
        </button>
      </div>
    </div>
  );
}
