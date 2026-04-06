import { Text, StyleSheet } from "@react-pdf/renderer";

import { pdfTheme } from "@/components/pdfx/theme";

const styles = StyleSheet.create({
  h1: {
    fontSize: 22,
    fontWeight: 700,
    color: pdfTheme.primary,
    marginBottom: 8,
  },
  h2: {
    fontSize: 14,
    fontWeight: 700,
    color: pdfTheme.primary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  h3: {
    fontSize: 11,
    fontWeight: 700,
    color: pdfTheme.primary,
    marginBottom: 4,
  },
});

export function Heading({
  level,
  children,
}: {
  level: 1 | 2 | 3;
  children: string;
}) {
  const style = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
  return <Text style={style}>{children}</Text>;
}
