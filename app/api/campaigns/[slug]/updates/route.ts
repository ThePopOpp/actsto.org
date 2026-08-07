import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import {
  createCampaignUpdate,
  listCampaignUpdates,
  parseUpdateInput,
  requireManagedCampaign,
  UpdateError,
} from "@/lib/dashboard/campaign-updates";

function fail(error: unknown) {
  if (error instanceof UpdateError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[campaign-updates] unhandled", error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getActSession();
    if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { slug } = await params;
    const { campaign } = await requireManagedCampaign(decodeURIComponent(slug), session);
    return NextResponse.json({ updates: await listCampaignUpdates(campaign.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getActSession();
    if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { slug } = await params;
    const { campaign, profile } = await requireManagedCampaign(decodeURIComponent(slug), session);
    const input = parseUpdateInput(await request.json().catch(() => null));

    const update = await createCampaignUpdate(campaign.id, profile.id, input);
    return NextResponse.json({ update, updates: await listCampaignUpdates(campaign.id) });
  } catch (error) {
    return fail(error);
  }
}
