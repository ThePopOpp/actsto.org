import "server-only";

import type { Prisma } from "@prisma/client";

import { parseCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { cleanImageUrl, cleanWebsite, parseGalleryUrls } from "@/lib/schools/details";
import { SCHOOL_CSV_COLUMNS } from "@/lib/schools/csv-template";
import type { SchoolImportResult } from "@/lib/schools/import-types";
import { normalizePhone } from "@/lib/sms/twilio";

export const SCHOOL_STATUSES = ["active", "pending", "inactive", "archived"] as const;

/** Every editable school field, as the admin form and the CSV import send it. */
export type SchoolInput = {
  name?: string;
  schoolType?: string;
  description?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  featuredImageUrl?: string;
  galleryUrls?: string[] | string;
  isPartner?: boolean | string;
  status?: string;
};

const TEXT_LIMITS: Record<string, number> = {
  name: 200,
  schoolType: 80,
  description: 4000,
  addressLine1: 300,
  addressLine2: 300,
  city: 120,
  zip: 10,
  email: 200,
};

export function slugifySchool(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "school";
}

function truthy(value: unknown) {
  if (typeof value === "boolean") return value;
  return /^(1|y|yes|true|x)$/i.test(String(value ?? "").trim());
}

/**
 * Turn untrusted input into a school update. Only keys present in `input` are
 * returned, so a partial edit leaves the other fields alone. An empty string
 * clears an optional field. Returns an error message instead when a value is
 * unusable.
 */
export function schoolDataFromInput(input: SchoolInput): { data: Prisma.SchoolUpdateInput } | { error: string } {
  const data: Prisma.SchoolUpdateInput = {};
  const has = (key: keyof SchoolInput) => Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined;

  for (const key of Object.keys(TEXT_LIMITS) as (keyof typeof TEXT_LIMITS)[]) {
    if (!has(key as keyof SchoolInput)) continue;
    const value = String(input[key as keyof SchoolInput] ?? "").trim().slice(0, TEXT_LIMITS[key]);
    if (key === "name") {
      if (!value) return { error: "Enter the school's name." };
      data.name = value;
    } else {
      (data as Record<string, unknown>)[key] = value || null;
    }
  }
  if (has("state")) data.state = String(input.state ?? "").trim().slice(0, 2).toUpperCase() || null;
  if (has("phone")) {
    const phone = String(input.phone ?? "").trim().slice(0, 40);
    data.phone = phone || null;
    data.phoneNormalized = phone ? normalizePhone(phone) || null : null;
  }
  if (has("website")) {
    const raw = String(input.website ?? "").trim();
    const website = cleanWebsite(raw);
    if (raw && !website) return { error: `"${raw}" isn't a website address.` };
    data.website = website || null;
  }
  for (const key of ["logoUrl", "featuredImageUrl"] as const) {
    if (!has(key)) continue;
    const raw = String(input[key] ?? "").trim();
    const url = cleanImageUrl(raw);
    if (raw && !url) return { error: `"${raw}" isn't an image link. Use a full https:// link or upload the image.` };
    data[key] = url || null;
  }
  if (has("galleryUrls")) data.galleryUrls = parseGalleryUrls(input.galleryUrls);
  if (has("isPartner")) data.isPartner = truthy(input.isPartner);
  if (has("status")) {
    const status = String(input.status ?? "").trim().toLowerCase();
    if (!(SCHOOL_STATUSES as readonly string[]).includes(status)) return { error: `Unknown status "${input.status}".` };
    data.status = status;
  }
  return { data };
}

/** A slug no other school uses (merged schools keep theirs on the archived row). */
export async function uniqueSchoolSlug(name: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  const base = slugifySchool(name);
  const taken = await db.school.findUnique({ where: { slug: base }, select: { id: true } });
  return taken ? `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` : base;
}

/** The current (not merged-away) school with this name, if there is one. */
export async function findSchoolByName(name: string) {
  return prisma.school.findFirst({
    where: {
      status: { not: "archived" },
      OR: [{ slug: slugifySchool(name) }, { name: { equals: name.trim(), mode: "insensitive" } }],
    },
    select: { id: true, name: true },
  });
}

// ── CSV import ──────────────────────────────────────────────────────────────

const HEADER_KEYS: Record<string, keyof SchoolInput> = {
  name: "name",
  school: "name",
  schoolname: "name",
  type: "schoolType",
  schooltype: "schoolType",
  description: "description",
  about: "description",
  address: "addressLine1",
  street: "addressLine1",
  addressline1: "addressLine1",
  address1: "addressLine1",
  addressline2: "addressLine2",
  address2: "addressLine2",
  suite: "addressLine2",
  city: "city",
  state: "state",
  zip: "zip",
  zipcode: "zip",
  postalcode: "zip",
  phone: "phone",
  phonenumber: "phone",
  email: "email",
  website: "website",
  url: "website",
  logo: "logoUrl",
  logourl: "logoUrl",
  featuredimage: "featuredImageUrl",
  featuredimageurl: "featuredImageUrl",
  featuredphoto: "featuredImageUrl",
  image: "featuredImageUrl",
  photo: "featuredImageUrl",
  gallery: "galleryUrls",
  galleryurls: "galleryUrls",
  galleryphotos: "galleryUrls",
  photos: "galleryUrls",
  partner: "isPartner",
  ispartner: "isPartner",
  status: "status",
};

const MAX_ROWS = 2000;

/**
 * Add or update schools from a CSV. A row whose name matches a current school
 * updates that school with the non-empty cells only (a blank cell never wipes
 * what is there); any other row creates a school, "On the list" unless the row
 * says otherwise. With `dryRun` nothing is written and the result says what
 * would happen, row by row.
 */
export async function importSchoolsCsv(csv: string, { dryRun }: { dryRun: boolean }): Promise<SchoolImportResult> {
  const table = parseCsv(csv);
  if (table.length < 2) throw new Error("The file has a header row but no schools.");
  if (table.length - 1 > MAX_ROWS) throw new Error(`Import up to ${MAX_ROWS} schools at a time.`);

  const headers = table[0].map((h) => HEADER_KEYS[h.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null);
  if (!headers.includes("name")) {
    throw new Error(`The first row must name the columns, including "name". Expected columns: ${SCHOOL_CSV_COLUMNS.join(", ")}.`);
  }
  const unknownColumns = table[0].filter((_, i) => !headers[i]).map((h) => h.trim()).filter(Boolean);

  const result: SchoolImportResult = { dryRun, created: 0, updated: 0, unchanged: 0, errors: 0, rows: [], unknownColumns };
  const seen = new Set<string>();

  for (const [index, cells] of table.slice(1).entries()) {
    const line = index + 2;
    const input: SchoolInput = {};
    headers.forEach((key, i) => {
      const cell = (cells[i] ?? "").trim();
      // Blank cells are left out, so they never clear an existing value.
      if (key && cell) (input as Record<string, unknown>)[key] = cell;
    });
    const name = String(input.name ?? "").trim();
    const fail = (message: string) => {
      result.errors += 1;
      result.rows.push({ line, name, outcome: "error", message });
    };
    if (!name) {
      fail("No school name.");
      continue;
    }
    const key = slugifySchool(name);
    if (seen.has(key)) {
      fail("This school is already earlier in the file.");
      continue;
    }
    seen.add(key);

    const parsed = schoolDataFromInput(input);
    if ("error" in parsed) {
      fail(parsed.error);
      continue;
    }

    const existing = await findSchoolByName(name);
    if (existing) {
      // Keep the existing record's spelling of the name.
      const { name: _ignored, ...changes } = parsed.data;
      void _ignored;
      if (Object.keys(changes).length === 0) {
        result.unchanged += 1;
        result.rows.push({ line, name: existing.name, outcome: "unchanged" });
        continue;
      }
      if (!dryRun) await prisma.school.update({ where: { id: existing.id }, data: changes });
      result.updated += 1;
      result.rows.push({ line, name: existing.name, outcome: "updated" });
      continue;
    }

    if (!dryRun) {
      await prisma.school.create({
        data: {
          ...(parsed.data as Prisma.SchoolCreateInput),
          name,
          slug: await uniqueSchoolSlug(name),
          status: (parsed.data.status as string | undefined) ?? "active",
          state: (parsed.data.state as string | null | undefined) ?? "AZ",
        },
      });
    }
    result.created += 1;
    result.rows.push({ line, name, outcome: "created" });
  }
  return result;
}
