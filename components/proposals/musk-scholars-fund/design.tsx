/**
 * Shared design pieces for the Musk Scholars Fund one-pager, deck and X card.
 *
 * Rules that let one component render in the browser AND through Satori (for
 * the PNG/PDF downloads): inline styles only, flexbox only (Satori has no
 * grid), every element with more than one child sets display:flex, sizes in
 * px, and sub-parts are plain function calls rather than JSX components.
 */

import { Children, Fragment, isValidElement, type CSSProperties, type ReactNode } from "react";

import { PROPOSAL_COLORS as C, type Signer } from "@/lib/proposals/musk-scholars-fund/content";

export type DesignFonts = { heading: string; body: string };

/** In the app: the next/font families loaded in app/layout.tsx. */
export const BROWSER_FONTS: DesignFonts = {
  heading: "var(--font-fraunces), Georgia, serif",
  body: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
};
/** In Satori: the names the renderer registers (lib/proposals/render.ts). */
export const RENDER_FONTS: DesignFonts = { heading: "Fraunces", body: "Geist" };

/** Logo sources: public paths in the browser, data URIs in Satori. */
export type DesignLogos = { onLight: string; onDark: string };
export const BROWSER_LOGOS: DesignLogos = { onLight: "/actsto-logo-light.svg", onDark: "/actsto-logo-dark.svg" };
/** The ACT wordmark's aspect ratio (viewBox 198 × 49). */
export const LOGO_RATIO = 198 / 49;

export type DesignProps = { fonts: DesignFonts; logos: DesignLogos; signer: Signer };

export function logo(src: string, height: number, style: CSSProperties = {}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Arizona Christian Tuition" width={Math.round(height * LOGO_RATIO)} height={height} style={style} />;
}

/**
 * Children as a flat, keyed list. Satori lays a fragment out as its own row,
 * so fragments are unwrapped; Children.toArray keys mapped lists.
 */
function flat(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? flat(child.props.children) : [child],
  );
}

export function row(children: ReactNode, style: CSSProperties = {}, key?: string | number) {
  return (
    <div key={key} style={{ display: "flex", flexDirection: "row", ...style }}>
      {flat(children)}
    </div>
  );
}
export function col(children: ReactNode, style: CSSProperties = {}, key?: string | number) {
  return (
    <div key={key} style={{ display: "flex", flexDirection: "column", ...style }}>
      {flat(children)}
    </div>
  );
}

export type RichPart = { text: string; style?: CSSProperties };

/**
 * Mixed-style text that wraps like a sentence. Satori has no inline layout,
 * so each word is its own item in a wrapping flex row (the same in the browser).
 */
export function rich(parts: RichPart[], style: CSSProperties = {}, key?: string | number) {
  const gap = 0.27; // a word space, in em
  return (
    <div key={key} style={{ display: "flex", flexWrap: "wrap", ...style }}>
      {parts.flatMap((part, p) =>
        part.text
          .split(/\s+/)
          .filter(Boolean)
          .map((word, w) => (
            <span key={`${p}-${w}`} style={{ marginRight: `${gap}em`, ...part.style }}>
              {word}
            </span>
          )),
      )}
    </div>
  );
}

/** "Faith. text…" — a bold lead-in followed by text. */
export function leadIn(title: string, text: string, style: CSSProperties, titleColor: string = C.navy) {
  return rich([{ text: title, style: { fontWeight: 700, color: titleColor } }, { text }], style, title);
}

/** The cross watermark from the X card. */
export function crossMark(size: number, style: CSSProperties) {
  const s = size / 520;
  return (
    <div style={{ display: "flex", position: "absolute", width: size, height: size, ...style }}>
      <div style={{ position: "absolute", left: 225 * s, top: 20 * s, width: 70 * s, height: 480 * s, borderRadius: 6 * s, background: C.white }} />
      <div style={{ position: "absolute", left: 80 * s, top: 150 * s, width: 360 * s, height: 70 * s, borderRadius: 6 * s, background: C.white }} />
    </div>
  );
}
