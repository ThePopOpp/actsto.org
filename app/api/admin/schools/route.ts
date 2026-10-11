import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export type AdminSchool = {
  id: string;
  name: string;
  slug: string;
  status: string;
  isPartner: boolean;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  phone: string;
  email: string;
  logoUrl: string;
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
    city: s.city ?? "",
    state: s.state ?? "",
    zip: s.zip ?? "",
    website: s.website ?? "",
    phone: s.phone ?? "",
    email: s.email ?? "",
    logoUrl: s.logoUrl ?? "",
    counts: { students: s._count.students, campaigns: s._count.campaigns, applications: s._count.scholarshipApps },
  }));
  const typedNames: TypedSchoolName[] = typed
    .filter((t) => t.schoolNameOther?.trim())
    .map((t) => ({ name: t.schoolNameOther!.trim(), applications: t._count._all }))
    .sort((a, b) => b.applications - a.applications);

  return NextResponse.json({ schools: rows, typedNames });
}

/** POST /api/admin/schools — add a school to the list. */
export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "Enter the school's name." }, { status: 400 });
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "school";
  const taken = await prisma.school.findUnique({ where: { slug: base }, select: { id: true } });
  const school = await prisma.school.create({
    data: { name, slug: taken ? `${base}-${Date.now().toString(36)}` : base, status: "active" },
    select: { id: true },
  });
  await logAdminActivity({ actorEmail: auth.email, action: "school.create", entityType: "school", entityId: school.id, after: { name } });
  return NextResponse.json({ ok: true, id: school.id });
}
