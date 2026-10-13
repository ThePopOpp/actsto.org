import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { findSchoolByName, schoolDataFromInput, uniqueSchoolSlug, type SchoolInput } from "@/lib/schools/admin";

export const dynamic = "force-dynamic";

export type AdminSchool = {
  id: string;
  name: string;
  slug: string;
  status: string;
  isPartner: boolean;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  phone: string;
  email: string;
  logoUrl: string;
  featuredImageUrl: string;
  galleryUrls: string[];
  schoolType: string;
  description: string;
  counts: { students: number; campaigns: number; applications: number };
};

export type TypedSchoolName = { name: string; applications: number };

/**
 * GET /api/admin/schools — every school with how much points at it, plus the
 * school names families typed under "Other" that aren't matched to a school.
 */
export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [schools, typed] = await Promise.all([
    prisma.school.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { _count: { select: { students: true, campaigns: true, scholarshipApps: true } } },
    }),
    prisma.scholarshipApplication.groupBy({
      by: ["schoolNameOther"],
      where: { schoolId: null, schoolNameOther: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const rows: AdminSchool[] = schools.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    status: s.status,
    isPartner: s.isPartner,
    addressLine1: s.addressLine1 ?? "",
    addressLine2: s.addressLine2 ?? "",
    city: s.city ?? "",
    state: s.state ?? "",
    zip: s.zip ?? "",
    website: s.website ?? "",
    phone: s.phone ?? "",
    email: s.email ?? "",
    logoUrl: s.logoUrl ?? "",
    featuredImageUrl: s.featuredImageUrl ?? "",
    galleryUrls: Array.isArray(s.galleryUrls) ? s.galleryUrls.filter((u): u is string => typeof u === "string") : [],
    schoolType: s.schoolType ?? "",
    description: s.description ?? "",
    counts: { students: s._count.students, campaigns: s._count.campaigns, applications: s._count.scholarshipApps },
  }));
  const typedNames: TypedSchoolName[] = typed
    .filter((t) => t.schoolNameOther?.trim())
    .map((t) => ({ name: t.schoolNameOther!.trim(), applications: t._count._all }))
    .sort((a, b) => b.applications - a.applications);

  return NextResponse.json({ schools: rows, typedNames });
}

/**
 * POST /api/admin/schools — add a school to the list, with any of its details
 * (address, phone, website, logo, featured image, gallery). A name that is
 * already on the list is refused rather than duplicated.
 */
export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as SchoolInput | null;
  const name = String(body?.name ?? "").trim();
  if (!body || !name) return NextResponse.json({ error: "Enter the school's name." }, { status: 400 });

  const parsed = schoolDataFromInput(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const existing = await findSchoolByName(name);
  if (existing) {
    return NextResponse.json({ error: `${existing.name} is already on the list. Edit it instead.` }, { status: 409 });
  }

  const school = await prisma.school.create({
    data: {
      ...(parsed.data as Prisma.SchoolCreateInput),
      name,
      slug: await uniqueSchoolSlug(name),
      status: (parsed.data.status as string | undefined) ?? "active",
    },
    select: { id: true },
  });
  await logAdminActivity({ actorEmail: auth.email, action: "school.create", entityType: "school", entityId: school.id, after: parsed.data });
  return NextResponse.json({ ok: true, id: school.id });
}
