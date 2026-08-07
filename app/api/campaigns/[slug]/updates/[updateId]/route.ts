import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import {
  deleteCampaignUpdate,
  listCampaignUpdates,
  parseUpdateInput,
  requireManagedCampaign,
  updateCampaignUpdate,
  UpdateError,
} from "@/lib/dashboard/campaign-updates";

function fail(error: unknown) {
  if (error instanceof UpdateError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[campaign-updates] unhandled", error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; updateId: string }> },
) {
  try {
    const session = await getActSession();
    if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { slug, updateId } = await params;
    const { campaign } = await requireManagedCampaign(decodeURIComponent(slug), session);
    const input = parseUpdateInput(await request.json().catch(() => null));

    const update = await updateCampaignUpdate(updateId, campaign.id, input);
    return NextResponse.json({ update, updates: await listCampaignUpdates(campaign.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; updateId: string }> },
) {
  try {
    const session = await getActSession();
    if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { slug, updateId } = await params;
    const { campaign } = await requireManagedCampaign(decodeURIComponent(slug), session);

    await deleteCampaignUpdate(updateId, campaign.id);
    return NextResponse.json({ ok: true, updates: await listCampaignUpdates(campaign.id) });
  } catch (error) {
    return fail(error);
  }
}
