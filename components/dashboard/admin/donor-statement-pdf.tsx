import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type StatementRow = { date: string; campaign: string; amount: string; receipt: string };
export type StatementData = {
  donorName: string;
  email: string;
  generatedAt: string;
  taxYear: string;
  rows: StatementRow[];
  total: string;
  count: number;
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#1f2937", fontFamily: "Helvetica" },
  brand: { fontSize: 16, fontWeight: 700, color: "#1e2a4a" },
  sub: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  h1: { fontSize: 18, fontWeight: 700, color: "#1e2a4a", marginTop: 20 },
  meta: { marginTop: 10, marginBottom: 16 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  label: { color: "#6b7280" },
  thead: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#1e2a4a", paddingBottom: 4, marginTop: 8 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e5e7eb", paddingVertical: 4 },
  cDate: { width: "22%" },
  cCampaign: { width: "38%" },
  cReceipt: { width: "22%" },
  cAmount: { width: "18%", textAlign: "right" },
  th: { fontWeight: 700, color: "#1e2a4a" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  totalLabel: { fontWeight: 700, marginRight: 12 },
  totalValue: { fontWeight: 700, color: "#1e2a4a", fontSize: 12 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});

export function DonorStatementDocument({ data }: { data: StatementData }) {
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <Text style={s.brand}>ACTSTO.org</Text>
        <Text style={s.sub}>Arizona Christian Tuition · Donation Statement</Text>

        <Text style={s.h1}>Donation Statement</Text>
        <View style={s.meta}>
          <View style={s.metaRow}><Text style={s.label}>Donor</Text><Text>{data.donorName}</Text></View>
          {data.email ? <View style={s.metaRow}><Text style={s.label}>Email</Text><Text>{data.email}</Text></View> : null}
          <View style={s.metaRow}><Text style={s.label}>Tax year</Text><Text>{data.taxYear}</Text></View>
          <View style={s.metaRow}><Text style={s.label}>Gifts</Text><Text>{data.count}</Text></View>
          <View style={s.metaRow}><Text style={s.label}>Generated</Text><Text>{data.generatedAt}</Text></View>
        </View>

        <View style={s.thead}>
          <Text style={[s.cDate, s.th]}>Date</Text>
          <Text style={[s.cCampaign, s.th]}>Campaign</Text>
          <Text style={[s.cReceipt, s.th]}>Receipt #</Text>
          <Text style={[s.cAmount, s.th]}>Amount</Text>
        </View>
        {data.rows.map((r, i) => (
          <View style={s.row} key={i}>
            <Text style={s.cDate}>{r.date}</Text>
            <Text style={s.cCampaign}>{r.campaign}</Text>
            <Text style={s.cReceipt}>{r.receipt}</Text>
            <Text style={s.cAmount}>{r.amount}</Text>
          </View>
        ))}

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total paid support</Text>
          <Text style={s.totalValue}>{data.total}</Text>
        </View>

        <Text style={s.footer}>
          This statement summarizes paid donations on record. Retain for your Arizona tax-credit filing.
          Arizona Christian Tuition · actsto.org
        </Text>
      </Page>
    </Document>
  );
}
