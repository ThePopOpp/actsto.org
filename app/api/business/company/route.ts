import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";

export const dynamic = "force-dynamic";

const MAX_FIELD = 300;
const MAX_LOGO_DATA_URL = 2_000_000;

function field(value: unknown, max = MAX_FIELD) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Nine digits, shown as XX-XXXXXXX. Anything else is refused rather than stored. */
function normalizeEin(raw: string): string | null {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 9) return null;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

async function ownProfile() {
  const session = await getActSession();
  if (!session) return null;
  const profile = await prisma.profile.findFirst({
    where: { email: { equals: session.email, mode: "insensitive" } },
    select: { id: true, userRoles: { select: { role: true } } },
  });
  if (!profile) return null;
  // The company record belongs to business donor accounts only.
  const isBusiness =
    session.role === "donor_business" || profile.userRoles.some((r) => r.role === "donor_business");
  return isBusiness ? profile : null;
}

/** GET /api/business/company — the signed-in business's own company record. */
export async function GET() {
  const profile = await ownProfile();
  if (!profile) return NextResponse.json({ error: "Not signed in to a business account." }, { status: 401 });

  const business = await prisma.businessDonorProfile.findUnique({ where: { userId: profile.id } });
  return NextResponse.json(
    {
      company: {
        businessName: business?.businessName ?? "",
        ein: business?.ein ?? "",
        businessEmail: business?.businessEmail ?? "",
        businessPhone: business?.businessPhone ?? "",
        addressLine1: business?.addressLine1 ?? "",
        addressLine2: business?.addressLine2 ?? "",
        city: business?.city ?? "",
        state: business?.state ?? "AZ",
        zip: business?.zip ?? "",
        logoUrl: business?.logoUrl ?? "",
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/** PUT /api/business/company — save the company record used on receipts. */
export async function PUT(request: Request) {
  const profile = await ownProfile();
  if (!profile) return NextResponse.json({ error: "Not signed in to a business account." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });

  const ein = normalizeEin(field(body.ein));
  if (ein === null) {
    return NextResponse.json({ error: "An EIN has nine digits, like 12-3456789." }, { status: 400 });
  }

  const logo = typeof body.logoUrl === "string" ? body.logoUrl : "";
  if (logo && !logo.startsWith("data:image/") && !logo.startsWith("https://")) {
    return NextResponse.json({ error: "The logo must be an uploaded image." }, { status: 400 });
  }
  if (logo.length > MAX_LOGO_DATA_URL) {
    return NextResponse.json({ error: "That logo is too large. Use an image under 1.5 MB." }, { status: 400 });
  }

  const businessPhone = field(body.businessPhone);
  const data = {
    businessName: field(body.businessName) || null,
    ein: ein || null,
    businessEmail: field(body.businessEmail).toLowerCase() || null,
    businessPhone: businessPhone || null,
    businessPhoneNormalized: businessPhone ? normalizePhone(businessPhone) : null,
    addressLine1: field(body.addressLine1) || null,
    addressLine2: field(body.addressLine2) || null,
    city: field(body.city) || null,
    state: (field(body.state) || "AZ").toUpperCase().slice(0, 2),
    zip: field(body.zip, 10) || null,
    logoUrl: logo || null,
  };
  const complete = Boolean(data.businessName && data.ein && data.addressLine1 && data.city && data.zip);

  await prisma.businessDonorProfile.upsert({
    where: { userId: profile.id },
    create: { userId: profile.id, ...data, profileStatus: complete ? "complete" : "incomplete" },
    update: { ...data, profileStatus: complete ? "complete" : "incomplete" },
  });

  return NextResponse.json({ ok: true });
}
