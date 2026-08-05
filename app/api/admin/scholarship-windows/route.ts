import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import { requireCapability, ScopeError } from "@/lib/scholarship/scope";

/**
 * Application windows are data, not constants. Staff move these dates without a
 * deploy — which is the whole point of the table.
 */

type WindowBody = {
  id?: string;
  schoolYear?: string;
  opensAt?: string;
  closesAt?: string;
  lateGraceUntil?: string | null;
  isPublished?: boolean;
};

function parse(body: WindowBody | null) {
  if (!body?.schoolYear || !/^\d{4}\/\d{4}$/.test(body.schoolYear)) {
    throw new ScopeError("Enter a school year like 2026/2027.", 400);
  }
  const opensAt = body.opensAt ? new Date(body.opensAt) : null;
  const closesAt = body.closesAt ? new Date(body.closesAt) : null;
  if (!opensAt || Number.isNaN(opensAt.getTime())) {
    throw new ScopeError("Enter a valid opening date.", 400);
  }
  if (!closesAt || Number.isNaN(closesAt.getTime())) {
    throw new ScopeError("Enter a valid closing date.", 400);
  }
  if (closesAt <= opensAt) {
    throw new ScopeError("The closing date has to be after the opening date.", 400);
  }

  const lateGraceUntil = body.lateGraceUntil ? new Date(body.lateGraceUntil) : null;
  if (lateGraceUntil && Number.isNaN(lateGraceUntil.getTime())) {
    throw new ScopeError("Enter a valid grace date, or leave it blank.", 400);
  }
  if (lateGraceUntil && lateGraceUntil < closesAt) {
    throw new ScopeError("The grace date has to be on or after the closing date.", 400);
  }

  return {
    schoolYear: body.schoolYear,
    opensAt,
    closesAt,
    lateGraceUntil,
    isPublished: body.isPublished === true,
  };
}

export async function POST(request: Request) {
  try {
    await requireCapability("windows.manage");
    const body = (await request.json().catch(() => null)) as WindowBody | null;
    const data = parse(body);

    const window = await prisma.applicationWindow.upsert({
      where: { schoolYear: data.schoolYear },
      create: data,
      update: data,
    });

    return NextResponse.json({ window });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
