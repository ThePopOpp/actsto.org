import type { ReactNode } from "react";

/** A fixed-size design shown smaller, keeping its layout exactly. */
export function Scaled({ width, height, scale, children, className = "" }: { width: number; height: number; scale: number; children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-md border border-border bg-white shadow-sm ${className}`} style={{ width: width * scale, height: height * scale }}>
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}
