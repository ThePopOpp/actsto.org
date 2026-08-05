import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import {
  addInternalNote,
  approveApplication,
  claimApplication,
  denyApplication,
  extendInformationDeadline,
  reopenApplication,
  requestInformation,
} from "@/lib/scholarship/reviews";
import { requireCapability, ScopeError } from "@/lib/scholarship/scope";

const DECISION_ACTIONS = ["approve", "deny", "request_info", "extend"] as const;

/**
 * Staff review actions. Gated on a named capability rather than on a role
 * string, so adding a reviewer tier later is one map entry.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as {
      action?: string;
      internalNote?: string;
      parentMessage?: string;
      fieldsRequested?: string[];
      overflowVerified?: boolean;
      dueAt?: string;
    } | null;

    const action = body?.action ?? "";

    const actor =
      action === "reopen"
        ? await requireCapability("application.reopen")
        : (DECISION_ACTIONS as readonly string[]).includes(action)
          ? await requireCapability("review.decide")
          : await requireCapability("review.claim");

    const exists = await prisma.scholarshipApplication.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new ScopeError("Application not found.", 404);

    switch (action) {
      case "claim":
        await claimApplication(actor, id);
        break;
      case "approve":
        await approveApplication(actor, {
          applicationId: id,
          action: "approve",
          internalNote: body?.internalNote,
          parentMessage: body?.parentMessage,
          overflowVerified: body?.overflowVerified === true,
        });
        break;
      case "deny":
        await denyApplication(actor, {
          applicationId: id,
          action: "deny",
          internalNote: body?.internalNote,
          parentMessage: body?.parentMessage,
        });
        break;
      case "request_info":
        await requestInformation(actor, {
          applicationId: id,
          action: "request_info",
          internalNote: body?.internalNote,
          parentMessage: body?.parentMessage,
          fieldsRequested: body?.fieldsRequested ?? [],
        });
        break;
      case "extend": {
        if (!body?.dueAt) {
          return NextResponse.json({ error: "Pick a new deadline." }, { status: 400 });
        }
        const dueAt = new Date(body.dueAt);
        if (Number.isNaN(dueAt.getTime())) {
          return NextResponse.json({ error: "That isn't a valid date." }, { status: 400 });
        }
        await extendInformationDeadline(actor, id, dueAt, body.internalNote);
        break;
      }
      case "reopen":
        await reopenApplication(actor, {
          applicationId: id,
          action: "reopen",
          internalNote: body?.internalNote,
          parentMessage: body?.parentMessage,
        });
        break;
      case "note":
        await addInternalNote(actor, id, body?.internalNote ?? "");
        break;
      default:
        return NextResponse.json({ error: "Unknown review action." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
