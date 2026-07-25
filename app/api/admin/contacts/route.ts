import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";
import { toContactDTO } from "@/lib/contacts/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const stage = url.searchParams.get("stage") ?? "";
  const type = url.searchParams.get("type") ?? "";
  const status = url.searchParams.get("status") ?? "active";

  const where: Prisma.ContactWhereInput = {
    ...(status === "all" ? {} : { status }),
    ...(stage ? { stage } : {}),
    ...(type ? { contactType: type } : {}),
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { company: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [contacts, total, users, archived, recent, byStage] = await Promise.all([
    prisma.contact.findMany({ where, orderBy: { updatedAt: "desc" }, take: 500 }),
    prisma.contact.count({ where: { status: "active" } }),
    prisma.contact.count({ where: { status: "active", userId: { not: null } } }),
    prisma.contact.count({ where: { status: "archived" } }),
    prisma.contact.count({ where: { status: "active", createdAt: { gte: new Date(Date.now() - 30 * 864e5) } } }),
    prisma.contact.groupBy({ by: ["stage"], where: { status: "active" }, _count: { _all: true } }),
  ]);

  const userIds = contacts.map((c) => c.userId).filter(Boolean) as string[];
  const roleRows = userIds.length
    ? await prisma.userRoleRecord.findMany({ where: { userId: { in: userIds }, status: "active" }, select: { userId: true, role: true } })
    : [];
  const rolesByUser = new Map<string, string[]>();
  for (const r of roleRows) rolesByUser.set(r.userId, [...(rolesByUser.get(r.userId) ?? []), r.role]);

  const stageCounts: Record<string, number> = {};
  for (const g of byStage) stageCounts[g.stage] = g._count._all;

  return NextResponse.json({
    contacts: contacts.map((c) => toContactDTO(c, c.userId ? rolesByUser.get(c.userId) : undefined)),
    stats: { total, users, nonUsers: total - users, archived, recent, stageCounts },
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof b?.id === "string" ? b.id : "";
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const email = str(b?.email);
  const phone = str(b?.phone);

  const data = {
    firstName: str(b?.firstName),
    lastName: str(b?.lastName),
    displayName: str(b?.displayName),
    email,
    emailNormalized: email ? email.toLowerCase() : null,
    phone,
    phoneNormalized: phone ? normalizePhone(phone) || null : null,
    company: str(b?.company),
    jobTitle: str(b?.jobTitle),
    contactType: str(b?.contactType),
    stage: str(b?.stage) ?? "new",
    tags: Array.isArray(b?.tags) ? (b!.tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
    source: str(b?.source),
    notes: str(b?.notes),
    city: str(b?.city),
    state: str(b?.state),
    createdBy: auth.email,
  };

  const contact = id
    ? await prisma.contact.update({ where: { id }, data })
    : await prisma.contact.create({ data });

  return NextResponse.json({ ok: true, contact: toContactDTO(contact) });
}
