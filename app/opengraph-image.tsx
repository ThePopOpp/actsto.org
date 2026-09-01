import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Arizona Christian Tuition — actsto.org";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The site-wide link preview card.
 *
 * Drawn rather than photographed, deliberately. With no `og:image`, iMessage and
 * the other scrapers fall back to whatever large image they find on the page —
 * which meant the first featured campaign's photo became the preview for the
 * whole site. That put a real family and a real student in front of every link
 * anyone pasted anywhere, without them ever agreeing to it.
 *
 * Individual campaign pages still use their own photo, which is the point of
 * those pages and is consented to. This is the default for everything else.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #001138 0%, #0f234e 100%)",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: "#b21e2a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            ✝
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff" }}>
            actsto<span style={{ color: "#e8737f" }}>.org</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 15,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#f0b429",
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            Arizona Christian Tuition Organization
          </div>
          {/* Satori requires an explicit display on any element with more than
              one child, so the two lines are stacked rather than split by a
              <br /> — which would be three children of a plain div. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 62,
              lineHeight: 1.12,
              color: "#ffffff",
              fontWeight: 700,
            }}
          >
            <div style={{ display: "flex" }}>Turn your Arizona taxes</div>
            <div style={{ display: "flex" }}>into a child&apos;s education</div>
          </div>
          <div style={{ fontSize: 27, lineHeight: 1.4, color: "#c3ccda", marginTop: 24 }}>
            The state tax credit costs most Arizona filers nothing — you choose where
            the money you already owe ends up.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              background: "#b21e2a",
              color: "#ffffff",
              fontSize: 22,
              fontWeight: 600,
              padding: "13px 30px",
              borderRadius: 10,
            }}
          >
            Support a student
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#8fa0bd" }}>actsto.org</div>
        </div>
      </div>
    ),
    size,
  );
}
