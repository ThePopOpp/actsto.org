import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";

export const dynamic = "force-dynamic";

const OSES = ["iOS", "iPadOS", "Android", "Windows", "macOS", "Other"];

/** Public "notify me when the app launches" waitlist. Stored as a CRM contact. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; phone?: string; os?: string }
    | null;

  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body?.email === "string" ? body.email.trim().slice(0, 200) : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim().slice(0, 40) : "";
  const os = OSES.includes(body?.os ?? "") ? (body!.os as string) : "Other";

  if (!name) return NextResponse.json({ error: "Your name is required." }, { status: 400 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const [firstName, ...rest] = name.split(/\s+/);
  const emailNormalized = email.toLowerCase();

  const existing = await prisma.contact.findFirst({ where: { emailNormalized }, select: { id: true, tags: true } });
  const data = {
    firstName: firstName || null,
    lastName: rest.join(" ") || null,
    displayName: name,
    email,
    emailNormalized,
    phone: phone || null,
    phoneNormalized: phone ? normalizePhone(phone) || null : null,
    source: "app_waitlist",
    notes: `Requested the mobile app (${os}).`,
  };

  if (existing) {
    const tags = Array.from(new Set([...(existing.tags ?? []), "app-waitlist", os]));
    await prisma.contact.update({ where: { id: existing.id }, data: { ...data, tags } });
  } else {
    await prisma.contact.create({ data: { ...data, stage: "new", tags: ["app-waitlist", os] } });
  }

  return NextResponse.json({ ok: true });
}
