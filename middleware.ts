import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { canAccessSuperAdminDashboard } from "@/lib/auth/admin-allowlist";
import { decodeSession } from "@/lib/auth/cookie";

function isLockedAdminPath(pathname: string): boolean {
  return pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isLockedAdminPath(pathname)) {
    return NextResponse.next();
  }

  // Build a Supabase client that can refresh the session in middleware
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ── 1. Supabase Auth (primary) ──────────────────────────────────────────
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      if (!canAccessSuperAdminDashboard(user.email)) {
        const dash = new URL("/dashboard", request.url);
        dash.searchParams.set("error", "forbidden");
        return NextResponse.redirect(dash);
      }
      return supabaseResponse;
    }
  } catch { /* fall through to legacy cookie */ }

  // ── 2. Legacy act_session cookie (migration fallback) ─────────────────
  const session = decodeSession(request.cookies.get("act_session")?.value);

  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    login.searchParams.set("role", "super_admin");
    return NextResponse.redirect(login);
  }

  if (session.role !== "super_admin") {
    const dash = new URL("/dashboard", request.url);
    dash.searchParams.set("error", "forbidden");
    return NextResponse.redirect(dash);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/admin", "/dashboard/admin/:path*"],
};
