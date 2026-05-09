import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase/server";

const MAX_FIELD_LENGTH = 8192;
const MAX_AVATAR_DATA_URL_LENGTH = 2_000_000;

function text(value: unknown) {
  if (typeof value !== "string") return "";
  return value.slice(0, MAX_FIELD_LENGTH);
}

function optionalAvatar(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  if (!value.startsWith("data:image/") && !value.startsWith("https://") && !value.startsWith("http://")) {
    throw new Error("Profile photo must be an image data URL or hosted image URL.");
  }
  if (value.length > MAX_AVATAR_DATA_URL_LENGTH) {
    throw new Error("Profile photo is too large. Please upload a smaller square image.");
  }
  return value;
}

async function getProfileIdentity() {
  const session = await getActSession();
  if (!session) return null;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  let profile = user?.id
    ? await prisma.profile
        .upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            email: session.email.toLowerCase(),
            displayName: session.name,
            fullName: session.name,
            activeAccountType: session.role === "super_admin" ? null : session.role,
            primaryAccountType: session.roles[0] ?? (session.role === "super_admin" ? null : session.role),
            isSuperAdmin: session.role === "super_admin",
          },
          update: { email: session.email.toLowerCase() },
        })
        .catch(() => null)
    : null;

  if (!profile) {
    profile = await prisma.profile.findFirst({ where: { email: session.email.toLowerCase() } }).catch(() => null);
  }

  return { session, profile };
}

function profilePayload(profile: NonNullable<Awaited<ReturnType<typeof getProfileIdentity>>>["profile"]) {
  return {
    name: profile?.displayName ?? profile?.fullName ?? "",
    phone: profile?.phone ?? "",
    avatarUrl: profile?.avatarUrl ?? "",
  };
}

export async function GET() {
  const identity = await getProfileIdentity();
  if (!identity) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { session, profile } = identity;
  const base = profilePayload(profile);

  if (!profile) {
    return NextResponse.json({
      profile: {
        ...base,
        email: session.email,
        address: "",
        city: "",
        state: "AZ",
        zip: "",
      },
    });
  }

  if (session.role === "parent") {
    const parent = await prisma.parentGuardianProfile.findUnique({ where: { userId: profile.id } }).catch(() => null);
    return NextResponse.json({
      profile: {
        ...base,
        email: profile.email,
        address: parent?.addressLine1 ?? "",
        city: parent?.city ?? "",
        state: parent?.state ?? "AZ",
        zip: parent?.zip ?? "",
      },
    });
  }

  if (session.role === "donor_business") {
    const business = await prisma.businessDonorProfile.findUnique({ where: { userId: profile.id } }).catch(() => null);
    return NextResponse.json({
      profile: {
        ...base,
        email: profile.email,
        address: business?.addressLine1 ?? "",
        city: business?.city ?? "",
        state: business?.state ?? "AZ",
        zip: business?.zip ?? "",
      },
    });
  }

  return NextResponse.json({
    profile: {
      ...base,
      email: profile.email,
      address: "",
      city: "",
      state: "AZ",
      zip: "",
    },
  });
}

export async function PUT(request: Request) {
  const identity = await getProfileIdentity();
  if (!identity) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!identity.profile) {
    return NextResponse.json({ error: "Profile record could not be loaded." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });

  let avatarUrl: string | null;
  try {
    avatarUrl = optionalAvatar(body.avatarUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid profile photo." },
      { status: 400 },
    );
  }

  const name = text(body.name).trim();
  const phone = text(body.phone).trim();
  const address = text(body.address).trim();
  const city = text(body.city).trim();
  const state = text(body.state).trim() || "AZ";
  const zip = text(body.zip).trim();

  const profile = await prisma.profile.update({
    where: { id: identity.profile.id },
    data: {
      displayName: name || identity.profile.displayName,
      fullName: name || identity.profile.fullName,
      phone,
      avatarUrl,
    },
  });

  if (identity.session.role === "parent") {
    await prisma.parentGuardianProfile.upsert({
      where: { userId: profile.id },
      create: {
        userId: profile.id,
        addressLine1: address,
        city,
        state,
        zip,
        profileStatus: address && city && state && zip ? "complete" : "incomplete",
      },
      update: {
        addressLine1: address,
        city,
        state,
        zip,
        profileStatus: address && city && state && zip ? "complete" : "incomplete",
      },
    });
  }

  if (identity.session.role === "donor_business") {
    await prisma.businessDonorProfile.upsert({
      where: { userId: profile.id },
      create: {
        userId: profile.id,
        addressLine1: address,
        city,
        state,
        zip,
        profileStatus: address && city && state && zip ? "complete" : "incomplete",
      },
      update: {
        addressLine1: address,
        city,
        state,
        zip,
        profileStatus: address && city && state && zip ? "complete" : "incomplete",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
