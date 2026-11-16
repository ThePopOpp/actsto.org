import "server-only";

import { NextResponse } from "next/server";

import { requireAllocationActor } from "@/lib/allocation/api";
import { PROPOSAL_KEY } from "@/lib/proposals/musk-scholars-fund/content";
import { getOrCreateProposal } from "@/lib/proposals/server";

/** Proposals that exist in code. A route for any other key is a 404. */
export const KNOWN_PROPOSAL_KEYS = [PROPOSAL_KEY] as const;

/** Super Admin + a known proposal key, or the error response to return. */
export async function requireProposalAdmin(key: string) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return { ok: false as const, response: auth.response };
  if (!(KNOWN_PROPOSAL_KEYS as readonly string[]).includes(key)) {
    return { ok: false as const, response: NextResponse.json({ error: "Proposal not found." }, { status: 404 }) };
  }
  return { ok: true as const, actor: auth.actor, proposal: await getOrCreateProposal(key) };
}
