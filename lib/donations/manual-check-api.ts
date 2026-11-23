import { NextResponse } from "next/server";

import { ManualCheckError } from "@/lib/donations/manual-check";

/** JSON error for the manual check routes; unexpected errors are logged, never leaked. */
export function manualCheckErrorResponse(error: unknown) {
  if (error instanceof ManualCheckError) {
    return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status });
  }
  console.error("[manual-check]", error);
  return NextResponse.json({ error: "Something went wrong. Nothing was saved." }, { status: 500 });
}
