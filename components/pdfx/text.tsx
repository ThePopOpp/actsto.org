import { Text as PdfText, StyleSheet } from "@react-pdf/renderer";

import { pdfTheme } from "@/components/pdfx/theme";

const styles = StyleSheet.create({
  base: {
    fontSize: 10,
    lineHeight: 1.45,
    color: pdfTheme.foreground,
    marginBottom: 4,
  },
  muted: {
    fontSize: 9,
    lineHeight: 1.4,
    color: pdfTheme.muted,
    marginBottom: 3,
  },
  small: {
    fontSize: 8,
    color: pdfTheme.muted,
  },
});

export function BodyText({
  children,
  muted,
}: {
  children: string;
  muted?: boolean;
}) {
  return <PdfText style={muted ? styles.muted : styles.base}>{children}</PdfText>;
}

export function SmallText({ children }: { children: string }) {
  return <PdfText style={styles.small}>{children}</PdfText>;
}
