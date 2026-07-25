import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";

export const dynamic = "force-dynamic";

/** Minimal CSV parser (handles quoted fields, escaped quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const KEY_MAP: Record<string, string> = {
  firstname: "firstName", first: "firstName", fname: "firstName",
  lastname: "lastName", last: "lastName", lname: "lastName",
  name: "displayName", fullname: "displayName", displayname: "displayName",
  email: "email", emailaddress: "email",
  phone: "phone", phonenumber: "phone", mobile: "phone", cell: "phone",
  company: "company", organization: "company", org: "company",
  jobtitle: "jobTitle", title: "jobTitle", role: "jobTitle",
  contacttype: "contactType", type: "contactType",
  stage: "stage", city: "city", state: "state", source: "source", notes: "notes", tags: "tags",
};

function norm(header: string): string | null {
  const key = header.toLowerCase().replace(/[^a-z]/g, "");
  return KEY_MAP[key] ?? null;
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { csv?: string } | null;
  const csv = typeof body?.csv === "string" ? body.csv : "";
  if (!csv.trim()) return NextResponse.json({ error: "CSV content is required." }, { status: 400 });

  const rows = parseCsv(csv);
  if (rows.length < 2) return NextResponse.json({ error: "No data rows found." }, { status: 400 });

  const headers = rows[0].map(norm);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of rows.slice(1)) {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) rec[h] = (raw[i] ?? "").trim(); });
    const hasIdentity = rec.firstName || rec.lastName || rec.displayName || rec.email || rec.phone;
    if (!hasIdentity) { skipped++; continue; }

    const email = rec.email || null;
    const phone = rec.phone || null;
    const data = {
      firstName: rec.firstName || null,
      lastName: rec.lastName || null,
      displayName: rec.displayName || null,
      email,
      emailNormalized: email ? email.toLowerCase() : null,
      phone,
      phoneNormalized: phone ? normalizePhone(phone) || null : null,
      company: rec.company || null,
      jobTitle: rec.jobTitle || null,
      contactType: rec.contactType || null,
      stage: rec.stage || "new",
      city: rec.city || null,
      state: rec.state || null,
      source: rec.source || "import",
      notes: rec.notes || null,
      tags: rec.tags ? rec.tags.split(/[;|]/).map((t) => t.trim()).filter(Boolean) : [],
      createdBy: auth.email,
    };

    const existing = email
      ? await prisma.contact.findFirst({ where: { emailNormalized: email.toLowerCase() }, select: { id: true } })
      : null;
    if (existing) {
      await prisma.contact.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.contact.create({ data });
      created++;
    }
  }

  return NextResponse.json({ ok: true, created, updated, skipped });
}
