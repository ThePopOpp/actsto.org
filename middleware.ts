import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Admin authorization happens in the server layout via getActSession(), which
  // understands both Supabase Auth and the legacy act_session cookie. Middleware
  // only sees the legacy cookie, so enforcing role checks here can block valid
  // Supabase Super Admin sessions after role-switch testing.
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/admin", "/dashboard/admin/:path*"],
};
