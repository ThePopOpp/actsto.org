import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { createServerClient } from "@/lib/supabase/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Sign out of Supabase Auth
  try {
    const supabase = await createServerClient();
    await supabase.auth.signOut();
  } catch { /* non-critical */ }

  // Clear legacy cookie
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
