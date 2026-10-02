import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

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
};

const ORG = {
  name: "Arizona Christian Tuition",
  ein: "39-3034324",
  contact: "(602) 421-8301 · hello@actsto.org · actsto.org",
};

const s = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: "#1f2937", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 150, height: 37, marginBottom: 8 },
  brand: { fontSize: 13, fontWeight: 700, color: "#1e2a4a" },
  sub: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  receiptBox: { alignItems: "flex-end" },
  receiptLabel: { fontSize: 8, color: "#6b7280", textTransform: "uppercase" },
  receiptNumber: { fontSize: 11, fontWeight: 700, color: "#1e2a4a", marginTop: 2 },
  h1: { fontSize: 18, fontWeight: 700, color: "#1e2a4a", marginTop: 28 },
  intro: { marginTop: 6, color: "#4b5563", lineHeight: 1.3 },
  columns: { flexDirection: "row", marginTop: 20, gap: 24 },
  column: { flex: 1 },
  sectionLabel: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 },
  line: { marginBottom: 2 },
  table: { marginTop: 22, borderTopWidth: 1, borderColor: "#1e2a4a" },
  row: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderColor: "#e5e7eb", paddingVertical: 6 },
  label: { color: "#6b7280" },
  value: { fontWeight: 700, color: "#111827", maxWidth: "60%", textAlign: "right" },
  amountRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  amountLabel: { fontWeight: 700, color: "#1e2a4a", fontSize: 12 },
  amountValue: { fontWeight: 700, color: "#1e2a4a", fontSize: 16 },
  notice: { marginTop: 18, padding: 10, backgroundColor: "#f3f4f6", lineHeight: 1.3, color: "#374151" },
  noticeTitle: { fontWeight: 700, color: "#1e2a4a", marginBottom: 3 },
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
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});

/** `logo` is the PNG wordmark; react-pdf cannot draw the site's SVG logo. */
export function TaxReceiptDocument({ data, logo }: { data: TaxReceiptPdfData; logo?: Buffer | null }) {
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

        <View style={s.notice}>
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

        <Text style={s.footer}>
          {ORG.name} · EIN {ORG.ein} · {ORG.contact}
        </Text>
      </Page>
    </Document>
  );
}
