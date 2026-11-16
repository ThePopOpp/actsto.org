import { col, leadIn, logo, row, type DesignProps } from "@/components/proposals/musk-scholars-fund/design";
import {
  ASK,
  DISCLAIMER,
  GIVING_PATHS,
  impactRows,
  LONG_HEADLINE,
  NOT_AN_ENDORSEMENT,
  PROPOSAL_COLORS as C,
  signerContact,
  signerLine,
  SOURCES,
  STATS,
  SUMMARY,
  WHY,
} from "@/lib/proposals/musk-scholars-fund/content";

export const ONE_PAGER_SIZE = { width: 816, height: 1056 };

const sectionLabel = { display: "flex", fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.red } as const;

/** The US Letter one-pager (816×1056 at 96 dpi). */
export function OnePager({ fonts, logos, signer }: DesignProps) {
  const who = [signerLine(signer), signerContact(signer)].filter(Boolean).join(" · ");
  return (
    <div
      style={{
        width: 816,
        height: 1056,
        boxSizing: "border-box",
        padding: "52px 56px 44px",
        background: C.white,
        color: C.ink,
        fontFamily: fonts.body,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        overflow: "hidden",
      }}
    >
      {row(
        <>
          {logo(logos.onLight, 36)}
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.red }}>
            A proposal for Elon Musk
          </span>
        </>,
        { alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: `2px solid ${C.navy}` },
      )}

      {col(
        <>
          <div style={{ display: "flex", fontFamily: fonts.heading, fontWeight: 600, fontSize: 34, lineHeight: 1.1, letterSpacing: -0.5, color: C.navy }}>
            {LONG_HEADLINE}
          </div>
          <div style={{ display: "flex", fontSize: 15, lineHeight: 1.5, color: "#3f3f46" }}>{SUMMARY}</div>
        </>,
        { gap: 10 },
      )}

      {row(
        STATS.map((s) => (
          <div
            key={s.value}
            style={{ display: "flex", flexDirection: "column", flex: 1, gap: 2, border: `1px solid ${C.lineStrong}`, borderRadius: 8, padding: "12px 14px" }}
          >
            <span style={{ fontFamily: fonts.heading, fontSize: 24, fontWeight: 600, color: s.accent ? C.red : C.navy }}>{s.value}</span>
            <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.35 }}>{s.label}</span>
          </div>
        )),
        { gap: 10 },
      )}

      {col(
        <>
          <div style={sectionLabel}>Why Elon</div>
          {row(
            <>
              {col(WHY.slice(0, 2).map((w) => leadIn(w.title, w.text, { fontSize: 13.5, lineHeight: 1.45 })), { flex: 1, gap: 8 })}
              {col(WHY.slice(2).map((w) => leadIn(w.title, w.text, { fontSize: 13.5, lineHeight: 1.45 })), { flex: 1, gap: 8 })}
            </>,
            { gap: 20 },
          )}
        </>,
        { gap: 8 },
      )}

      {row(
        <>
          {col(
            <>
              <div style={sectionLabel}>Impact</div>
              {col(
                <>
                  {row(
                    <>
                      <span style={{ flex: 1, padding: "7px 12px" }}>Gift</span>
                      <span style={{ flex: 1, padding: "7px 12px", textAlign: "right", justifyContent: "flex-end", display: "flex" }}>Student-years</span>
                    </>,
                    { background: "#f4f4f5", fontWeight: 600, borderBottom: `1px solid ${C.lineStrong}` },
                  )}
                  {impactRows().map((r, i, all) =>
                    row(
                      <>
                        <span style={{ flex: 1, padding: "7px 12px" }}>{r.proposed ? `${r.label} (proposed)` : r.label}</span>
                        <span style={{ flex: 1, padding: "7px 12px", display: "flex", justifyContent: "flex-end" }}>{r.studentYears.toLocaleString("en-US")}</span>
                      </>,
                      {
                        // Satori rejects undefined style values, so omit rather than unset.
                        ...(i < all.length - 1 ? { borderBottom: `1px solid ${C.lineStrong}` } : {}),
                        fontWeight: r.proposed ? 700 : 400,
                        color: r.proposed ? C.navy : C.ink,
                      },
                      r.gift,
                    ),
                  )}
                </>,
                { border: `1px solid ${C.lineStrong}`, borderRadius: 8, overflow: "hidden", fontSize: 13.5 },
              )}
            </>,
            { flex: 1, gap: 8 },
          )}
          {col(
            <>
              <div style={sectionLabel}>Giving paths</div>
              {GIVING_PATHS.map((g) => leadIn(g.title, `— ${g.text}`, { fontSize: 13.5, lineHeight: 1.45 }))}
            </>,
            { flex: 1, gap: 8 },
          )}
        </>,
        { gap: 16 },
      )}

      {row(
        <>
          {col(
            <>
              <span style={{ fontFamily: fonts.heading, fontSize: 21, fontWeight: 600, lineHeight: 1.2 }}>{ASK.title}</span>
              <span style={{ fontSize: 13, color: C.mist }}>{ASK.steps.join(" → ")}</span>
            </>,
            { gap: 4, flex: 1 },
          )}
          <span style={{ fontSize: 14, fontWeight: 600 }}>actsto.org/contact</span>
        </>,
        { background: C.navy, color: C.white, borderRadius: 10, padding: "18px 22px", alignItems: "center", justifyContent: "space-between", gap: 20 },
      )}

      <div style={{ display: "flex", fontSize: 12, lineHeight: 1.45, color: "#52525b" }}>
        {[who, `Sources: ${SOURCES.join("; ")}.`, DISCLAIMER, NOT_AN_ENDORSEMENT].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}
