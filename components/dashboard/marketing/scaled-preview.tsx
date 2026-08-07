"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Shows a block document at its real design width, scaled to fit the space it's
 * given.
 *
 * The alternative — re-styling the document smaller for thumbnails — produces a
 * picture of something that isn't what you'll get. Scaling the actual output
 * keeps every proportion honest: if a headline wraps to three lines in the
 * thumbnail, it wraps to three lines on the postcard.
 *
 * A ResizeObserver rather than a fixed scale, because these render in a grid
 * that's one, two or four across depending on the viewport.
 */
export function ScaledPreview({
  html,
  designWidth,
  aspectRatio,
  background,
  padding = 32,
  radius = 12,
  className,
}: {
  /** Output of `blocksToHtml` — inline-styled, self-contained. */
  html: string;
  /** Width the document is authored against, in CSS px. */
  designWidth: number;
  /** e.g. "3 / 2". Omit to let the content set the height. */
  aspectRatio?: string;
  background: string;
  padding?: number;
  radius?: number;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  // Starts null so nothing paints at the wrong size for a frame before the
  // first measurement lands.
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    // setState inside the observer callback is the intended shape — this is a
    // subscription to an external system, not a synchronous effect body write.
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setScale(width / designWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [designWidth]);

  return (
    <div
      ref={frameRef}
      className={cn("w-full overflow-hidden", className)}
      style={{ aspectRatio, background, borderRadius: radius }}
    >
      {scale === null ? null : (
        <div
          // Scaled from the top-left so the document's top edge stays pinned to
          // the frame's top edge at any scale.
          style={{
            width: designWidth,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            padding,
            boxSizing: "border-box",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
