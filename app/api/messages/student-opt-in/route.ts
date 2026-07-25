import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getMessagingUser } from "@/lib/messaging/server";

export const dynamic = "force-dynamic";

/** The signed-in student's current donor-messaging opt-in. */
export async function GET() {
  const me = await getMessagingUser();
  if (!me || me.messagingRole !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const student = await prisma.student.findFirst({ where: { studentUserId: me.userId }, select: { allowDonorMessages: true } });
  return NextResponse.json({ allow: Boolean(student?.allowDonorMessages) });
}

/** Toggle whether donors may start conversations with this 16+ student. */
export async function POST(request: Request) {
  const me = await getMessagingUser();
  if (!me || me.messagingRole !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { allow?: boolean } | null;
  const allow = Boolean(body?.allow);
  await prisma.student.updateMany({ where: { studentUserId: me.userId }, data: { allowDonorMessages: allow } });
  return NextResponse.json({ ok: true, allow });
}
