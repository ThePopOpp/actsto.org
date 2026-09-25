import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import {
  deleteEmailTemplates,
  duplicateEmailTemplates,
  setEmailTemplatesStatus,
} from "@/lib/admin/email-templates";

/** Actions the templates library offers on a selection. */
const ACTIONS = ["draft", "publish", "archive", "duplicate", "delete"] as const;
type BulkAction = (typeof ACTIONS)[number];

function isAction(value: unknown): value is BulkAction {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

/** Guards against a runaway selection turning into one enormous statement. */
const MAX_IDS = 200;

/**
 * Apply one action to many templates.
 *
 * Super Admin only, checked here rather than in the UI — the buttons are only
 * a convenience and this endpoint is what actually enforces access.
 */
export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { action?: unknown; ids?: unknown }
    | null;

  if (!isAction(body?.action)) {
    return NextResponse.json(
      { error: `Action must be one of: ${ACTIONS.join(", ")}.` },
      { status: 400 },
    );
  }

  const ids = Array.isArray(body?.ids)
    ? [...new Set(body.ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0))]
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Select at least one template." }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: `Too many templates at once — ${MAX_IDS} is the maximum.` },
      { status: 400 },
    );
  }

  try {
    switch (body.action) {
      case "draft": {
        const count = await setEmailTemplatesStatus(ids, "draft");
        return NextResponse.json({ ok: true, action: "draft", count });
      }
      case "publish": {
        // "Published" for a template means ready to send.
        const count = await setEmailTemplatesStatus(ids, "ready");
        return NextResponse.json({ ok: true, action: "publish", count });
      }
      case "archive": {
        const count = await setEmailTemplatesStatus(ids, "archived");
        return NextResponse.json({ ok: true, action: "archive", count });
      }
      case "duplicate": {
        const { created } = await duplicateEmailTemplates(ids, auth.email);
        return NextResponse.json({ ok: true, action: "duplicate", count: created });
      }
      case "delete": {
        const count = await deleteEmailTemplates(ids);
        return NextResponse.json({ ok: true, action: "delete", count });
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not apply that action." },
      { status: 400 },
    );
  }
}
