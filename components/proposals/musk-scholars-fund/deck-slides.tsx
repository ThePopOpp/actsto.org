import type { ReactNode } from "react";

import { col, crossMark, leadIn, logo, row, type DesignProps } from "@/components/proposals/musk-scholars-fund/design";
import {
  ASK,
  AVERAGE_SCHOLARSHIP,
  CONTACT_URL,
  DISCLAIMER,
  GIVING_PATHS,
  HEADLINE,
  impactRows,
  NOT_AN_ENDORSEMENT,
  PROPOSAL_COLORS as C,
  signerLine,
  SOURCES,
  WHY,
} from "@/lib/proposals/musk-scholars-fund/content";

export const SLIDE_SIZE = { width: 1920, height: 1080 };

type SlideFn = (p: DesignProps) => ReactNode;

/** A light content slide: eyebrow, title, body, and a small footer. */
function frame(p: DesignProps, n: number, eyebrow: string, title: string, body: ReactNode, dark = false) {
  const fg = dark ? C.white : C.ink;
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        boxSizing: "border-box",
        padding: "96px 120px 72px",
        background: dark ? C.navy : C.white,
        color: fg,
        fontFamily: p.fonts.body,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {dark ? crossMark(760, { right: -150, top: 160, opacity: 0.06 }) : null}
      {col(
        <>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: dark ? "#e8a3a4" : C.red }}>
            {eyebrow}
          </div>
          <div style={{ display: "flex", fontFamily: p.fonts.heading, fontWeight: 600, fontSize: 76, lineHeight: 1.08, letterSpacing: -1.5, color: dark ? C.white : C.navy, maxWidth: 1560 }}>
            {title}
          </div>
        </>,
        { gap: 18 },
      )}
      {col(body, { flex: 1, justifyContent: "center", marginTop: 40 })}
      {row(
        <>
          {logo(dark ? p.logos.onDark : p.logos.onLight, 44)}
          <span style={{ fontSize: 22, color: dark ? C.mist : C.subtle }}>{n} / 9</span>
        </>,
        { alignItems: "center", justifyContent: "space-between" },
      )}
    </div>
  );
}

const bigText = (t: string, color: string = C.ink) => (
  <div style={{ display: "flex", fontSize: 40, lineHeight: 1.45, color, maxWidth: 1500 }}>{t}</div>
);

function statTile(p: DesignProps, value: string, label: string, accent = false) {
  return col(
    <>
      <span style={{ fontFamily: p.fonts.heading, fontSize: 96, fontWeight: 600, color: accent ? C.red : C.navy }}>{value}</span>
      <span style={{ fontSize: 30, color: C.muted, lineHeight: 1.3 }}>{label}</span>
    </>,
    { flex: 1, gap: 8, border: `2px solid ${C.lineStrong}`, borderRadius: 20, padding: "40px 44px" },
  );
}

export const SLIDES: SlideFn[] = [
  // 1. Title
  (p) => (
    <div
      style={{
        width: 1920,
        height: 1080,
        boxSizing: "border-box",
        padding: "110px 120px",
        background: C.navy,
        color: C.white,
        fontFamily: p.fonts.body,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {crossMark(780, { right: -140, top: 150, opacity: 0.07 })}
      {row(
        <span style={{ padding: "12px 28px", borderRadius: 999, background: C.red, fontSize: 30, fontWeight: 600 }}>
          A proposal for Elon Musk
        </span>,
      )}
      {col(
        <>
          <div style={{ display: "flex", fontFamily: p.fonts.heading, fontWeight: 600, fontSize: 132, lineHeight: 1.0, letterSpacing: -3 }}>{HEADLINE}</div>
          <div style={{ display: "flex", fontSize: 48, lineHeight: 1.3, color: C.mist, maxWidth: 1400 }}>The Musk Scholars Fund at Arizona Christian Tuition</div>
        </>,
        { gap: 32 },
      )}
      {row(
        <>
          {logo(p.logos.onDark, 76)}
          <span style={{ fontSize: 34, fontWeight: 600 }}>actsto.org</span>
        </>,
        { alignItems: "center", justifyContent: "space-between" },
      )}
    </div>
  ),

  // 2. The gap
  (p) =>
    frame(
      p,
      2,
      "The gap",
      "Families want Christian schools. Tuition stands in the way.",
      col(
        <>
          {row(
            <>
              {statTile(p, "$3,131", "2026 joint individual tax-credit cap")}
              {statTile(p, "Far more", "what a family needs for a year of tuition", true)}
            </>,
            { gap: 32 },
          )}
          {bigText("Individual tax credits are capped, and a family's need is far larger. A founding gift fills the gap the credits can't.", C.muted)}
        </>,
        { gap: 48 },
      ),
    ),

  // 3. The Arizona model
  (p) =>
    frame(
      p,
      3,
      "A proven model",
      "Arizona pioneered school choice through tax-credit scholarships in 1997.",
      col(
        <>
          {row(
            <>
              {statTile(p, "$264M", "to Arizona STOs (FY2023)")}
              {statTile(p, "$204M", "in scholarships awarded")}
              {statTile(p, "1997", "the year Arizona started")}
            </>,
            { gap: 32 },
          )}
          {bigText("ACT is a certified Arizona School Tuition Organization. We fund tuition scholarships so families, regardless of income, can choose a private Christian education.", C.muted)}
        </>,
        { gap: 48 },
      ),
    ),

  // 4. One child, one year
  (p) =>
    frame(
      p,
      4,
      "The unit of impact",
      "One gift. One child. One year.",
      row(
        <>
          <span style={{ fontFamily: p.fonts.heading, fontSize: 260, fontWeight: 600, color: C.red, lineHeight: 1 }}>
            ${AVERAGE_SCHOLARSHIP.toLocaleString("en-US")}
          </span>
          <div style={{ display: "flex", fontSize: 48, lineHeight: 1.35, color: C.ink, maxWidth: 760 }}>
            puts one Arizona child in a Christ-centered, excellence-first school for a year.
          </div>
        </>,
        { alignItems: "center", gap: 72 },
      ),
    ),

  // 5. Why Elon
  (p) =>
    frame(
      p,
      5,
      "Why Elon",
      "Your convictions, put to work for Arizona's kids.",
      col(
        [0, 2].map((start) =>
          row(
            WHY.slice(start, start + 2).map((w) =>
              col(leadIn(w.title, w.text, { fontSize: 36, lineHeight: 1.45 }), {
                flex: 1,
                borderLeft: `6px solid ${C.red}`,
                paddingLeft: 28,
              }),
            ),
            { gap: 64 },
          ),
        ),
        { gap: 56 },
      ),
    ),

  // 6. Impact
  (p) =>
    frame(
      p,
      6,
      "Impact",
      "What a gift becomes, in years of tuition.",
      col(
        <>
          {row(
            <>
              <span style={{ flex: 1, padding: "20px 36px" }}>Gift</span>
              <span style={{ flex: 1, padding: "20px 36px", display: "flex", justifyContent: "flex-end" }}>Student-years of tuition</span>
            </>,
            { background: C.paler, fontWeight: 600, color: C.muted, fontSize: 30, borderBottom: `2px solid ${C.line}` },
          )}
          {impactRows().map((r) =>
            row(
              <>
                <span style={{ flex: 1, padding: "22px 36px" }}>{r.proposed ? `${r.label} · proposed` : r.label}</span>
                <span style={{ flex: 1, padding: "22px 36px", display: "flex", justifyContent: "flex-end" }}>
                  {r.studentYears.toLocaleString("en-US")}
                </span>
              </>,
              {
                fontSize: 42,
                fontWeight: r.proposed ? 700 : 400,
                background: r.proposed ? C.navy : C.white,
                color: r.proposed ? C.white : C.ink,
                borderBottom: `2px solid ${C.line}`,
              },
              r.gift,
            ),
          )}
          <div style={{ display: "flex", padding: "16px 36px", fontSize: 24, color: C.subtle }}>
            At ACT&apos;s ${AVERAGE_SCHOLARSHIP.toLocaleString("en-US")} target average scholarship.
          </div>
        </>,
        { border: `2px solid ${C.line}`, borderRadius: 20, overflow: "hidden" },
      ),
    ),

  // 7. Giving paths
  (p) =>
    frame(
      p,
      7,
      "Giving paths",
      "Flexible ways to give.",
      row(
        GIVING_PATHS.map((g) =>
          col(
            <>
              <span style={{ fontFamily: p.fonts.heading, fontSize: 48, fontWeight: 600, color: C.navy }}>{g.title}</span>
              <span style={{ fontSize: 32, lineHeight: 1.45, color: C.muted }}>{g.text}</span>
            </>,
            { flex: 1, gap: 18, background: C.paler, border: `2px solid ${C.line}`, borderRadius: 20, padding: "44px 40px" },
          ),
        ),
        { gap: 32 },
      ),
    ),

  // 8. The ask
  (p) =>
    frame(
      p,
      8,
      "The ask",
      ASK.title.replace(/^The ask: a/, "A"),
      col(
        <>
          {row(
            ASK.steps.map((step, i) =>
              col(
                <>
                  <span style={{ fontFamily: p.fonts.heading, fontSize: 64, fontWeight: 600, color: "#e8a3a4" }}>{i + 1}</span>
                  <span style={{ fontSize: 38, lineHeight: 1.35 }}>{step}</span>
                </>,
                { flex: 1, gap: 12, borderTop: `4px solid ${C.red}`, paddingTop: 28 },
              ),
            ),
            { gap: 48 },
          )}
        </>,
        {},
      ),
      true,
    ),

  // 9. Thank you
  (p) => {
    const who = signerLine(p.signer);
    const reach = [p.signer.phone?.trim(), p.signer.email?.trim()].filter(Boolean).join(" · ");
    return frame(
      p,
      9,
      "Thank you",
      ASK.cta,
      col(
        <>
          {who ? <div style={{ display: "flex", fontSize: 44, fontWeight: 600, color: C.navy }}>{who}</div> : null}
          <div style={{ display: "flex", fontSize: 36, color: C.muted }}>{["Arizona Christian Tuition", reach].filter(Boolean).join(" · ")}</div>
          <div style={{ display: "flex", fontSize: 36, color: C.red, fontWeight: 600 }}>{CONTACT_URL.replace("https://", "")}</div>
          <div style={{ display: "flex", marginTop: 56, fontSize: 20, lineHeight: 1.5, color: C.subtle, maxWidth: 1600 }}>
            {`Sources: ${SOURCES.join("; ")}. ${DISCLAIMER} ${NOT_AN_ENDORSEMENT}`}
          </div>
        </>,
        { gap: 16 },
      ),
    );
  },
];
