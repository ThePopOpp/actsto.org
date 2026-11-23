import { NextResponse } from "next/server";

import { requireAllocationActor } from "@/lib/allocation/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/donations/manual/donor-search?q= — accounts matching a name
 * or email, for linking a check to an existing donor. Each comes with the
 * address and business details from their latest gift, to prefill the form.
 * Super Admin only. Linking is optional: a check donor may have no account.
 */
export async function GET(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });

  const profiles = await prisma.profile.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { fullName: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true, firstName: true, lastName: true, fullName: true, displayName: true, phone: true },
    take: 8,
    orderBy: { email: "asc" },
  });

  const results = await Promise.all(
    profiles.map(async (p) => {
      const last = await prisma.donationDetail.findFirst({
        where: {
          OR: [{ donation: { userId: p.id } }, { donorEmail: { equals: p.email, mode: "insensitive" } }],
          billingAddressLine1: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: {
          donorFirstName: true,
          donorMiddleName: true,
          donorLastName: true,
          billingAddressLine1: true,
          billingAddressLine2: true,
          billingCity: true,
          billingState: true,
          billingZip: true,
          businessName: true,
          businessEin: true,
          businessContactTitle: true,
          filingStatus: true,
        },
      });
      return {
        id: p.id,
        email: p.email,
        name: p.fullName || p.displayName || [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email,
        firstName: p.firstName ?? last?.donorFirstName ?? "",
        lastName: p.lastName ?? last?.donorLastName ?? "",
        middleName: last?.donorMiddleName ?? "",
        phone: p.phone ?? "",
        addressLine1: last?.billingAddressLine1 ?? "",
        addressLine2: last?.billingAddressLine2 ?? "",
        city: last?.billingCity ?? "",
        state: last?.billingState ?? "",
        zip: last?.billingZip ?? "",
        businessName: last?.businessName ?? "",
        ein: last?.businessEin ?? "",
        contactTitle: last?.businessContactTitle ?? "",
        filingStatus: last?.filingStatus === "married" ? "married" : last?.filingStatus ? "single" : "",
      };
    }),
  );
  return NextResponse.json({ results });
}
