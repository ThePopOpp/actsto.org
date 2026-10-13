import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { schoolDataFromInput, type SchoolInput } from "@/lib/schools/admin";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/schools/:id — edit a school's details (address, phone,
 * website, logo, featured image, gallery), partner flag or status. This is the
 * only place a school's details change; campaign saves never overwrite them.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as SchoolInput | null;
  if (!body) return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });

  const before = await prisma.school.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "School not found." }, { status: 404 });

  const parsed = schoolDataFromInput(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const data = parsed.data;

  await prisma.school.update({ where: { id }, data });
  await logAdminActivity({
    actorEmail: auth.email,
    action: "school.update",
    entityType: "school",
    entityId: id,
    before: Object.fromEntries(Object.keys(data).map((k) => [k, (before as Record<string, unknown>)[k]])),
    after: data,
  });
  return NextResponse.json({ ok: true });
}
