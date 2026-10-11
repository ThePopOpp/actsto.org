import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type SchoolChoice = {
  /** A school picked from the list. Always wins when it exists. */
  id?: string | null;
  /** A school typed under "Not listed". */
  name?: string | null;
  address?: string | null;
  website?: string | null;
  logo?: string | null;
};

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The school a campaign (or student) belongs to, as one record with an id.
 *
 * Campaign saves used to upsert a school by the slug of whatever name was
 * typed, and overwrite that school's address, website and logo with the
 * family's text. That is how one school became "Valley Christian", "Valley
 * Christian School" and "Valley Christian Schools — Tempe", and how Valley
 * Christian's street address ended up in Chandler beside a Tempe city.
 *
 * Now a school picked from the list is used as is. A typed name reuses an
 * existing school with the same name or slug, and only a genuinely new name
 * creates a record — as "pending", for staff to approve or merge on the
 * Schools screen. An existing school's details are never edited from here.
 */
export async function resolveSchool(db: Db, choice: SchoolChoice): Promise<string | null> {
  const id = choice.id?.trim();
  if (id) {
    const school = await db.school.findUnique({ where: { id }, select: { id: true, status: true } });
    if (school && school.status !== "archived") return school.id;
  }

  const name = choice.name?.trim();
  if (!name || name === "School" || name === "-") return null;
  const slug = slugify(name);
  if (!slug) return null;

  const existing = await db.school.findFirst({
    where: {
      status: { not: "archived" },
      OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }],
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  // A merged-away school keeps its slug on the archived row; never collide.
  const taken = await db.school.findUnique({ where: { slug }, select: { id: true } });
  const created = await db.school.create({
    data: {
      name,
      slug: taken ? `${slug}-${Date.now().toString(36)}` : slug,
      addressLine1: choice.address?.trim() || null,
      website: choice.website?.trim() || null,
      logoUrl: choice.logo?.trim() || null,
      status: "pending",
    },
    select: { id: true },
  });
  return created.id;
}
