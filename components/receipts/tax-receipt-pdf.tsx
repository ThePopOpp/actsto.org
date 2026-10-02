import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/** The same figures the donation form's breakdown and final summary show. */
export type TaxCreditBreakdown = {
  taxYear: string;
  totalDonation: string;
  /** Portion of the gift that counts toward this tax year's credit. */
  creditThisYear: string;
  /** Portion beyond this year's remaining limit, carried forward. */
  futureCredit: string;
  filingStatus: string;
  original: string;
  overflow: string;
  combined: string;
  otherStoGifts: string;
  earlierActGifts: string;
};

export type TaxReceiptPdfData = {
  receiptNumber: string;
  issuedAt: string;
  giftDate: string;
  donorName: string;
  donorEmail: string;
  donorAddress: string[];
  amount: string;
  taxYear: string;
  /** "Arizona tax credit" | "Quick gift" | … */
  giftType: string;
  isTaxCredit: boolean;
  designation: string;
  paymentReference: string;
  isVoid: boolean;
  /** Tax-credit gifts only. */
  breakdown?: TaxCreditBreakdown | null;
};

const ORG = {
  name: "Arizona Christian Tuition",
  ein: "39-3034324",
  contact: "(602) 421-8301 · hello@actsto.org · actsto.org",
};

const NAVY = "#1e2a4a";
const MUTED = "#6b7280";
const RULE = "#e5e7eb";

// Spacing is kept tight so a tax-credit receipt, with its breakdown, stays on
// one LETTER page. Check the page count after any layout change.
const s = StyleSheet.create({
  page: { paddingTop: 36, paddingHorizontal: 44, paddingBottom: 48, fontSize: 9.5, color: "#1f2937", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 138, height: 34, marginBottom: 6 },
  brand: { fontSize: 12, fontWeight: 700, color: NAVY },
  sub: { fontSize: 8.5, color: MUTED, marginTop: 1.5 },
  receiptBox: { alignItems: "flex-end" },
  receiptLabel: { fontSize: 7.5, color: MUTED, textTransform: "uppercase" },
  receiptNumber: { fontSize: 11, fontWeight: 700, color: NAVY, marginTop: 2 },
  h1: { fontSize: 16, fontWeight: 700, color: NAVY, marginTop: 16 },
  intro: { marginTop: 4, color: "#4b5563" },
  columns: { flexDirection: "row", marginTop: 12, gap: 24 },
  column: { flex: 1 },
  sectionLabel: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", marginBottom: 3 },
  line: { marginBottom: 1.5 },
  table: { marginTop: 12, borderTopWidth: 1, borderColor: NAVY },
  row: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderColor: RULE, paddingVertical: 4 },
  label: { color: MUTED },
  value: { fontWeight: 700, color: "#111827", maxWidth: "62%", textAlign: "right" },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7 },
  amountLabel: { fontWeight: 700, color: NAVY, fontSize: 11 },
  amountValue: { fontWeight: 700, color: NAVY, fontSize: 15 },
  panels: { flexDirection: "row", gap: 14, marginTop: 4 },
  panel: { flex: 1, borderWidth: 1, borderColor: RULE, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8 },
  panelTitle: { fontSize: 9, fontWeight: 700, color: NAVY, marginBottom: 4 },
  panelRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  panelRule: { borderTopWidth: 1, borderColor: RULE, marginTop: 2, paddingTop: 4 },
  panelLabel: { color: MUTED, maxWidth: "62%" },
  panelValue: { fontWeight: 700, color: "#111827", textAlign: "right" },
  panelEmphasis: { fontWeight: 700, color: NAVY },
  panelNote: { fontSize: 7.5, color: MUTED, marginTop: 4 },
  notice: { marginTop: 12, padding: 9, backgroundColor: "#f3f4f6", color: "#374151", fontSize: 8.5 },
  noticeTitle: { fontWeight: 700, color: NAVY, marginBottom: 3, fontSize: 9 },
  void: {
    position: "absolute",
    top: 300,
    left: 120,
    fontSize: 96,
    color: "#dc2626",
    opacity: 0.18,
    transform: "rotate(-30deg)",
    fontWeight: 700,
  },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 7.5, color: "#9ca3af", textAlign: "center" },
});

function PanelRow({ label, value, emphasis, rule }: { label: string; value: string; emphasis?: boolean; rule?: boolean }) {
  return (
    <View style={rule ? [s.panelRow, s.panelRule] : s.panelRow}>
      <Text style={emphasis ? [s.panelLabel, s.panelEmphasis] : s.panelLabel}>{label}</Text>
      <Text style={emphasis ? [s.panelValue, s.panelEmphasis] : s.panelValue}>{value}</Text>
    </View>
  );
}

/** `logo` is the PNG wordmark; react-pdf cannot draw the site's SVG logo. */
export function TaxReceiptDocument({ data, logo }: { data: TaxReceiptPdfData; logo?: Buffer | null }) {
  const b = data.breakdown;
  return (
    <Document title={`Receipt ${data.receiptNumber}`} author={ORG.name}>
      <Page size="LETTER" style={s.page}>
        {data.isVoid ? <Text style={s.void}>VOID</Text> : null}

        <View style={s.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
            {logo ? <Image src={{ data: logo, format: "png" }} style={s.logo} /> : null}
            <Text style={s.brand}>{ORG.name}</Text>
            <Text style={s.sub}>Certified Arizona School Tuition Organization · 501(c)(3) nonprofit</Text>
            <Text style={s.sub}>EIN {ORG.ein}</Text>
          </View>
          <View style={s.receiptBox}>
            <Text style={s.receiptLabel}>Receipt</Text>
            <Text style={s.receiptNumber}>{data.receiptNumber}</Text>
            <Text style={s.sub}>Issued {data.issuedAt}</Text>
          </View>
        </View>

        <Text style={s.h1}>Donation Receipt</Text>
        <Text style={s.intro}>
          Thank you for supporting Arizona students. This receipt acknowledges your contribution to {ORG.name}.
          Please keep it with your tax records.
        </Text>

        <View style={s.columns}>
          <View style={s.column}>
            <Text style={s.sectionLabel}>Donor</Text>
            <Text style={[s.line, { fontWeight: 700 }]}>{data.donorName}</Text>
            {data.donorAddress.map((line, i) => (
              <Text key={i} style={s.line}>
                {line}
              </Text>
            ))}
            {data.donorEmail ? <Text style={s.line}>{data.donorEmail}</Text> : null}
          </View>
          <View style={s.column}>
            <Text style={s.sectionLabel}>Organization</Text>
            <Text style={[s.line, { fontWeight: 700 }]}>{ORG.name}</Text>
            <Text style={s.line}>EIN {ORG.ein}</Text>
            <Text style={s.line}>{ORG.contact}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.row}>
            <Text style={s.label}>Date of gift</Text>
            <Text style={s.value}>{data.giftDate}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Gift type</Text>
            <Text style={s.value}>{data.giftType}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Tax year</Text>
            <Text style={s.value}>{data.taxYear}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Designation</Text>
            <Text style={s.value}>{data.designation}</Text>
          </View>
          {data.paymentReference ? (
            <View style={s.row}>
              <Text style={s.label}>Payment reference</Text>
              <Text style={s.value}>{data.paymentReference}</Text>
            </View>
          ) : null}
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>Amount received</Text>
            <Text style={s.amountValue}>{data.amount}</Text>
          </View>
        </View>

        {b ? (
          <View style={s.panels} wrap={false}>
            <View style={s.panel}>
              <Text style={s.panelTitle}>Tax credit breakdown</Text>
              <PanelRow label="Total donation" value={b.totalDonation} />
              <PanelRow label={`${b.taxYear} tax credit`} value={b.creditThisYear} emphasis />
              <PanelRow label="Future tax credit" value={b.futureCredit} />
              <Text style={s.panelNote}>
                The future tax credit is the part of this gift above your remaining {b.taxYear} limit. Arizona
                allows it to be carried forward for up to five years.
              </Text>
            </View>
            <View style={s.panel}>
              <Text style={s.panelTitle}>{b.taxYear} credit limits</Text>
              <PanelRow label="Filing status" value={b.filingStatus} />
              <PanelRow label="Original tax credit" value={b.original} />
              <PanelRow label="Overflow tax credit" value={b.overflow} />
              <PanelRow label="Combined total" value={b.combined} emphasis />
              <PanelRow label="Other STO gifts this year" value={b.otherStoGifts} rule />
              <PanelRow label="Earlier ACT gifts this year" value={b.earlierActGifts} />
              <Text style={s.panelNote}>Other STO and earlier ACT gifts as reported by the donor at checkout.</Text>
            </View>
          </View>
        ) : null}

        <View style={s.notice} wrap={false}>
          <Text style={s.noticeTitle}>No goods or services were provided in exchange for this contribution.</Text>
          {data.isTaxCredit ? (
            <Text>
              This contribution may qualify for the Arizona individual income tax credit for contributions to a
              certified School Tuition Organization (A.R.S. § 43-1089 and § 43-1089.03), claimed on Arizona Form 323
              and, for amounts above the original credit, Form 348. A donor may recommend a student but may not
              designate a contribution for the direct benefit of their own dependent (A.R.S. § 43-1603(C)).
              Consult your tax advisor about your eligibility.
            </Text>
          ) : (
            <Text>
              Consult your tax advisor about whether this contribution qualifies for an Arizona tax credit or a federal
              charitable deduction.
            </Text>
          )}
        </View>

        <Text style={s.footer} fixed>
          {ORG.name} · EIN {ORG.ein} · {ORG.contact}
        </Text>
      </Page>
    </Document>
  );
}
