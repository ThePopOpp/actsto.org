import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TEXT_FIELDS = ["name", "addressLine1", "city", "state", "zip", "website", "phone", "email", "logoUrl"] as const;
const STATUSES = ["active", "pending", "inactive", "archived"];

/**
 * PATCH /api/admin/schools/:id — edit a school's details, partner flag or
 * status. This is the only place a school's details change; campaign saves
 * no longer overwrite them.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });

  const before = await prisma.school.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "School not found." }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const key of TEXT_FIELDS) {
    if (key in body) {
      const value = typeof body[key] === "string" ? (body[key] as string).trim().slice(0, 500) : "";
      data[key] = key === "name" ? value || before.name : value || null;
    }
  }
  if (typeof data.state === "string") data.state = (data.state as string).toUpperCase().slice(0, 2);
  if ("isPartner" in body) data.isPartner = body.isPartner === true;
  if ("status" in body) {
    if (!STATUSES.includes(String(body.status))) return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    data.status = body.status;
  }

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
