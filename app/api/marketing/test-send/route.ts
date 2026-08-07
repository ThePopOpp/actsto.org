import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { sendEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 512 * 1024;

/**
 * Sends the signed-in user a copy of a marketing email they're composing, so
 * they can see how their own inbox renders it before pasting it into Gmail.
 *
 * Deliberately locked to `session.email`: the request body carries no recipient.
 * An endpoint that accepted arbitrary HTML *and* an arbitrary recipient would be
 * an open relay wearing a preview button.
 */
export async function POST(request: Request) {
  const session = await getActSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Sign in to send a test." }, { status: 401 });
  }

  let body: { subject?: unknown; html?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const html = typeof body.html === "string" ? body.html : "";
  const text = typeof body.text === "string" ? body.text : "";

  if (!subject || !html) {
    return NextResponse.json({ error: "Nothing to send." }, { status: 400 });
  }
  if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
    return NextResponse.json({ error: "That email is too large to test-send." }, { status: 413 });
  }

  try {
    const result = await sendEmail({
      to: session.email,
      subject: `[Test] ${subject}`,
      html,
      text: text || subject,
      templateKey: "marketing_test_send",
    });
    if (result.skipped) {
      return NextResponse.json(
        { error: "Email delivery isn't configured on this environment yet." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, sentTo: session.email });
  } catch (error) {
    console.error("[marketing/test-send]", error);
    return NextResponse.json({ error: "Could not send the test email." }, { status: 502 });
  }
}
