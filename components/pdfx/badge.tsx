import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  label: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

const variants = {
  success: { backgroundColor: "#15803d" },
  neutral: { backgroundColor: "#475569" },
  warning: { backgroundColor: "#b45309" },
  accent: { backgroundColor: "#C41E3A" },
} as const;

export function Badge({
  label,
  variant = "neutral",
}: {
  label: string;
  variant?: keyof typeof variants;
}) {
  return (
    <View style={[styles.wrap, variants[variant]]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}
