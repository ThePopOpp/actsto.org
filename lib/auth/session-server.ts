import { cookies } from "next/headers";

import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import type { ActSession } from "@/lib/auth/types";

export async function getActSession(): Promise<ActSession | null> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE_NAME)?.value);
}
