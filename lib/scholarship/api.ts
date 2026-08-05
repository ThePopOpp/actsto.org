import "server-only";

import { NextResponse } from "next/server";

import { ValidationError } from "@/lib/scholarship/applications";
import { IneligibleError, ScopeError } from "@/lib/scholarship/scope";

/**
 * One error translator for every scholarship route, so a `ScopeError` thrown
 * deep in the data layer surfaces as the right status everywhere rather than
 * as a 500 in some routes and a 403 in others.
 */
export function scholarshipErrorResponse(error: unknown): NextResponse {
  if (error instanceof ScopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message, issues: error.issues }, { status: 400 });
  }
  if (error instanceof IneligibleError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
  }

  console.error("[scholarship] unhandled route error", error);
  return NextResponse.json(
    { error: "Something went wrong on our end. Try again, and tell us if it keeps happening." },
    { status: 500 },
  );
}
