import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export type SchoolListItem = {
  id: string;
  name: string;
  city: string | null;
  address: string;
  website: string | null;
  logoUrl: string | null;
};

/**
 * GET /api/schools — the approved school list for pickers.
 *
 * Public details only (name, address, website, logo). Schools a family typed
 * that staff haven't approved yet are left out, so one family's spelling
 * doesn't become everyone's choice.
 */
export async function GET() {
  const schools = await prisma.school
    .findMany({
      where: { status: "active" },
      orderBy: [{ isPartner: "desc" }, { name: "asc" }],
      select: { id: true, name: true, city: true, addressLine1: true, state: true, zip: true, website: true, logoUrl: true },
    })
    .catch(() => []);

  const items: SchoolListItem[] = schools.map((s) => {
    const line1 = (s.addressLine1 ?? "").trim();
    const hasCityInLine = /\b[A-Z]{2}\s*\d{5}(-\d{4})?\s*$/.test(line1);
    const cityLine = [s.city, [s.state, s.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    return {
      id: s.id,
      name: s.name,
      city: s.city,
      address: hasCityInLine ? line1 : [line1, cityLine].filter(Boolean).join(", "),
      website: s.website,
      logoUrl: s.logoUrl,
    };
  });
  return NextResponse.json({ schools: items }, { headers: { "Cache-Control": "public, max-age=60" } });
}
