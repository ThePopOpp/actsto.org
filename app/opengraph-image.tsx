import fs from "node:fs";
import path from "node:path";

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Arizona Christian Tuition — actsto.org";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The site-wide link preview card.
 *
 * With no `og:image`, iMessage and the other scrapers fall back to whatever
 * large image they find on the page — which meant the first featured campaign's
 * photo became the preview for the whole site. That put a real family and a real
 * student in front of every link anyone pasted anywhere, without them ever
 * agreeing to it. This card is the deliberate answer.
 *
 * Individual campaign pages still use their own photo, which is the point of
 * those pages and is consented to. This is the default for everything else.
 */

/**
 * Assets are read off disk and inlined, not fetched over HTTP.
 *
 * This route is prerendered at build time, when the site isn't serving yet, so
 * an absolute URL to our own domain would have nothing to answer it. Reading the
 * file is also one less thing to fail at render time.
 */
function dataUri(relativePath: string): string {
  const file = fs.readFileSync(path.join(process.cwd(), "public", relativePath));
  return `data:image/png;base64,${file.toString("base64")}`;
}

export default function OpengraphImage() {
  const photo = dataUri("hero/emma-student.png");
  const mark = dataUri("act-favicon.png");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#001138",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders to a static PNG; next/image has no role here */}
        <img
          src={photo}
          alt=""
          width={size.width}
          height={size.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size.width,
            height: size.height,
            // Biased above centre for the same reason the campaign cards are:
            // when a landscape crop has to lose something, it should not be faces.
            objectFit: "cover",
            objectPosition: "50% 35%",
          }}
        />

        {/* Scrim. The headline sits over a photograph, and a photograph is not a
            reliable background — without this the type is legible or not
            depending on what someone was wearing. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size.width,
            height: size.height,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(0,17,56,0.72) 0%, rgba(0,17,56,0.30) 34%, rgba(0,17,56,0.86) 76%, rgba(0,17,56,0.96) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: size.width,
            height: size.height,
            padding: "56px 64px",
          }}
        >
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff" }}>
            actsto<span style={{ color: "#e8737f" }}>.org</span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 840 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 15,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: "#f0b429",
                  fontWeight: 700,
                  marginBottom: 16,
                }}
              >
                Arizona Christian Tuition Organization
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: 58,
                  lineHeight: 1.1,
                  color: "#ffffff",
                  fontWeight: 700,
                }}
              >
                {/* Stacked rather than split by a <br />: Satori requires an
                    explicit display on anything with more than one child. */}
                <div style={{ display: "flex" }}>Turn your Arizona taxes</div>
                <div style={{ display: "flex" }}>into a child&apos;s education</div>
              </div>
              <div style={{ display: "flex", fontSize: 25, color: "#c3ccda", marginTop: 18 }}>
                The state tax credit costs most Arizona filers nothing.
              </div>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
            <img
              src={mark}
              alt=""
              width={104}
              height={104}
              style={{ width: 104, height: 104, borderRadius: 52 }}
            />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
