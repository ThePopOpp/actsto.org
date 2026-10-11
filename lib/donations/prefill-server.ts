import "server-only";

import type { ActSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

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
  /** The portal the donor is signed in to, so a business donor gets the corporate form. */
  accountRole: string;
  /** The business's own record, for the corporate form. Null for other accounts. */
  business: {
    businessName: string;
    ein: string;
    businessEmail: string;
    businessPhone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zip: string;
  } | null;
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
 * Step 1 of the donation form for a signed-in donor.
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
export async function getDonorPrefill(session: ActSession): Promise<DonorPrefill> {

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
          select: {
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            zip: true,
            businessPhone: true,
            businessName: true,
            businessEmail: true,
            ein: true,
          },
        },
      },
    })
    .catch(() => null);

  if (!profile) {
    // Signed in but no profile row: the email is still known.
    const empty: DonorPrefill = {
      firstName: "", middleName: "", lastName: "", email: session.email, phone: "",
      addressLine1: "", addressLine2: "", city: "", state: "", zip: "",
      accountRole: session.role, business: null,
    };
    return empty;
  }

  const billing = await prisma.donorBillingProfile
    .findFirst({ where: { userId: profile.id }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] })
    .catch(() => null);

  // A business donor's address is the business's; everyone else's is their own.
  const isBusiness = session.role === "donor_business";
  const address =
    (isBusiness
      ? [profile.businessDonorProfile, billing, profile.parentGuardianProfile]
      : [billing, profile.parentGuardianProfile, profile.businessDonorProfile]
    ).find((a) => clean(a?.addressLine1)) ?? null;
  const biz = profile.businessDonorProfile;

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
    accountRole: session.role,
    business:
      isBusiness && biz
        ? {
            businessName: clean(biz.businessName),
            ein: clean(biz.ein),
            businessEmail: clean(biz.businessEmail),
            businessPhone: clean(biz.businessPhone),
            addressLine1: clean(biz.addressLine1),
            addressLine2: clean(biz.addressLine2),
            city: clean(biz.city),
            state: clean(biz.state),
            zip: clean(biz.zip),
          }
        : null,
  };

  return prefill;
}
