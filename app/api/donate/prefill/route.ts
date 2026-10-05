import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export type DonorPrefill = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
};

function clean(value: string | null | undefined) {
  return (value ?? "").trim();
}

/** "Mary Ann Smith" → Mary / Smith. Only a starting point: every field stays editable. */
function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first: parts[0] ?? "", last: "" };
  return { first: parts[0], last: parts[parts.length - 1] };
}

/**
 * GET /api/donate/prefill
 *
 * The signed-in donor's own contact details for step 1 of the tax-credit
 * donation form. Read only from the caller's profile — never another user's —
 * and returned in the body, never in a URL. Guests get 401 and the form stays
 * blank. SMS consent is deliberately not included: it is never prefilled.
 *
 * Address order: the saved donor billing profile, then the parent profile,
 * then the business profile. Names come from the account's first/middle/last,
 * falling back to the billing profile, then to a split of the display name.
 */
export async function GET() {
  const session = await getActSession().catch(() => null);
  if (!session?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const profile = await prisma.profile
    .findFirst({
      where: { email: { equals: session.email, mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        displayName: true,
        fullName: true,
        phone: true,
        parentGuardianProfile: { select: { addressLine1: true, addressLine2: true, city: true, state: true, zip: true } },
        businessDonorProfile: {
          select: { addressLine1: true, addressLine2: true, city: true, state: true, zip: true, businessPhone: true },
        },
      },
    })
    .catch(() => null);

  if (!profile) {
    // Signed in but no profile row: the email is still known.
    const empty: DonorPrefill = {
      firstName: "", middleName: "", lastName: "", email: session.email, phone: "",
      addressLine1: "", addressLine2: "", city: "", state: "", zip: "",
    };
    return NextResponse.json(empty, { headers: { "Cache-Control": "private, no-store" } });
  }

  const billing = await prisma.donorBillingProfile
    .findFirst({ where: { userId: profile.id }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] })
    .catch(() => null);

  const address =
    [billing, profile.parentGuardianProfile, profile.businessDonorProfile].find((a) => clean(a?.addressLine1)) ?? null;

  const fallback = splitName(clean(profile.fullName) || clean(profile.displayName));
  const prefill: DonorPrefill = {
    firstName: clean(profile.firstName) || clean(billing?.firstName) || fallback.first,
    middleName: clean(profile.middleName) || clean(billing?.middleName),
    lastName: clean(profile.lastName) || clean(billing?.lastName) || fallback.last,
    email: clean(billing?.email) || profile.email,
    phone: clean(profile.phone) || clean(billing?.phone) || clean(profile.businessDonorProfile?.businessPhone),
    addressLine1: clean(address?.addressLine1),
    addressLine2: clean(address?.addressLine2),
    city: clean(address?.city),
    state: clean(address?.state),
    zip: clean(address?.zip),
  };

  return NextResponse.json(prefill, { headers: { "Cache-Control": "private, no-store" } });
}
