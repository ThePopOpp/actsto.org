/**
 * The details a family (or staff) gives for a school that isn't on the list.
 * Client-safe: shared by the campaign form, the campaign save routes and the
 * admin Schools screen.
 */
export type SchoolDetails = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  featuredImageUrl: string;
  galleryUrls: string[];
};

export function emptySchoolDetails(): SchoolDetails {
  return {
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "AZ",
    zip: "",
    phone: "",
    featuredImageUrl: "",
    galleryUrls: [],
  };
}

function text(value: unknown, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** A web link or an uploaded file path; anything else is dropped. */
export function cleanImageUrl(value: unknown): string {
  const url = text(value, 2000);
  return /^(https?:\/\/|\/)/i.test(url) ? url : "";
}

/** Gallery links from an array, or from text with one link per line or separated by "|" or ";". */
export function parseGalleryUrls(value: unknown): string[] {
  const parts = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n|;]+/) : [];
  return Array.from(new Set(parts.map(cleanImageUrl).filter(Boolean))).slice(0, 24);
}

/** Normalize untrusted input (a request body, a CSV row) into SchoolDetails. */
export function parseSchoolDetails(value: unknown): SchoolDetails {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    addressLine1: text(raw.addressLine1),
    addressLine2: text(raw.addressLine2),
    city: text(raw.city, 120),
    state: text(raw.state, 2).toUpperCase() || "AZ",
    zip: text(raw.zip, 10),
    phone: text(raw.phone, 40),
    featuredImageUrl: cleanImageUrl(raw.featuredImageUrl),
    galleryUrls: parseGalleryUrls(raw.galleryUrls),
  };
}

/** A school website as a full link, or "" when it can't be one. */
export function cleanWebsite(value: unknown): string {
  const raw = text(value, 500);
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return "";
  }
}
