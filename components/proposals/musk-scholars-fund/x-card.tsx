import { col, crossMark, logo, rich, row, type DesignProps } from "@/components/proposals/musk-scholars-fund/design";
import { AVERAGE_SCHOLARSHIP, HEADLINE, PROPOSAL_COLORS as C } from "@/lib/proposals/musk-scholars-fund/content";

export const X_CARD_SIZE = { width: 1600, height: 900 };

/** The 1600×900 X (Twitter) post card. */
export function XCard({ fonts, logos }: Pick<DesignProps, "fonts" | "logos">) {
  return (
    <div
      style={{
        width: 1600,
        height: 900,
        boxSizing: "border-box",
        padding: "88px 96px",
        background: C.navy,
        color: C.white,
        fontFamily: fonts.body,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {crossMark(640, { right: -120, top: 130, opacity: 0.07 })}
      {row(
        <span style={{ padding: "10px 22px", borderRadius: 999, background: C.red, fontSize: 26, fontWeight: 600 }}>
          An open invitation to @elonmusk
        </span>,
      )}
      {col(
        <>
          <div style={{ display: "flex", fontFamily: fonts.heading, fontWeight: 600, fontSize: 104, lineHeight: 1.02, letterSpacing: -2.6 }}>
            {HEADLINE}
          </div>
          {rich(
            [
              { text: "Every" },
              { text: `$${AVERAGE_SCHOLARSHIP.toLocaleString("en-US")}`, style: { color: C.white, fontWeight: 700 } },
              { text: "puts one Arizona child in a Christ-centered school for a year." },
            ],
            { fontSize: 40, lineHeight: 1.35, color: C.mist, maxWidth: 1150 },
          )}
        </>,
        { gap: 28 },
      )}
      {row(
        <>
          {logo(logos.onDark, 64)}
          <span style={{ fontSize: 32, fontWeight: 600 }}>actsto.org</span>
        </>,
        { alignItems: "center", justifyContent: "space-between" },
      )}
    </div>
  );
}
