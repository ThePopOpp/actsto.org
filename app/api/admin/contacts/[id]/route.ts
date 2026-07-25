import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";
import { toContactDTO } from "@/lib/contacts/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const roles = contact.userId
    ? (await prisma.userRoleRecord.findMany({ where: { userId: contact.userId, status: "active" }, select: { role: true } })).map((r) => r.role)
    : undefined;
  return NextResponse.json({ contact: toContactDTO(contact, roles) });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const str = (v: unknown) => (typeof v === "string" ? (v.trim() || null) : undefined);
  const data: Prisma.ContactUpdateInput = {};
  if ("firstName" in b) data.firstName = str(b.firstName);
  if ("lastName" in b) data.lastName = str(b.lastName);
  if ("displayName" in b) data.displayName = str(b.displayName);
  if ("company" in b) data.company = str(b.company);
  if ("jobTitle" in b) data.jobTitle = str(b.jobTitle);
  if ("contactType" in b) data.contactType = str(b.contactType);
  if ("stage" in b && typeof b.stage === "string") data.stage = b.stage;
  if ("status" in b && typeof b.status === "string") data.status = b.status;
  if ("source" in b) data.source = str(b.source);
  if ("notes" in b) data.notes = str(b.notes);
  if ("avatarUrl" in b) data.avatarUrl = str(b.avatarUrl);
  if ("logoUrl" in b) data.logoUrl = str(b.logoUrl);
  if ("city" in b) data.city = str(b.city);
  if ("state" in b) data.state = str(b.state);
  if (Array.isArray(b.tags)) data.tags = (b.tags as unknown[]).filter((t): t is string => typeof t === "string");
  if ("email" in b) {
    const email = str(b.email);
    data.email = email;
    data.emailNormalized = email ? email.toLowerCase() : null;
  }
  if ("phone" in b) {
    const phone = str(b.phone);
    data.phone = phone;
    data.phoneNormalized = phone ? normalizePhone(phone) || null : null;
  }
  if (b.touchContacted) data.lastContactedAt = new Date();

  const contact = await prisma.contact.update({ where: { id }, data });
  return NextResponse.json({ ok: true, contact: toContactDTO(contact) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  await prisma.contact.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
