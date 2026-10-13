import { csvCell } from "@/lib/csv";

/** Columns the school CSV import reads, in template order. Client-safe. */
export const SCHOOL_CSV_COLUMNS = [
  "name",
  "school_type",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "zip",
  "phone",
  "email",
  "website",
  "logo_url",
  "featured_image_url",
  "gallery_urls",
  "is_partner",
  "status",
  "description",
] as const;

/** A template with one example row, for the "Download template" link. */
export function schoolCsvTemplate(): string {
  const example = [
    "Example Christian Academy",
    "K-12",
    "123 E Main St",
    "",
    "Phoenix",
    "AZ",
    "85004",
    "(602) 555-0100",
    "office@example.org",
    "https://example.org",
    "https://example.org/logo.png",
    "https://example.org/campus.jpg",
    "https://example.org/photo-1.jpg | https://example.org/photo-2.jpg",
    "no",
    "active",
    "A short description of the school.",
  ];
  return [SCHOOL_CSV_COLUMNS.join(","), example.map(csvCell).join(",")].join("\n") + "\n";
}
