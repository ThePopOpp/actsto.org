import "server-only";

import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";

export type ParentActor = { id: string; email: string; phone: string | null; isSuperAdmin: boolean };

/**
 * Resolve the profile behind the current request for student management.
 *
 * Returns null when there is no signed-in profile — every student route treats
 * that as a 401 rather than falling back to an unauthenticated write path.
 */
export async function getStudentActor(): Promise<ParentActor | null> {
  const session = await getActSession();
  if (!session?.email) return null;

  const profile = await prisma.profile
    .findFirst({
      where: { email: { equals: session.email, mode: "insensitive" } },
      select: { id: true, email: true, phone: true, isSuperAdmin: true },
    })
    .catch(() => null);
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    phone: profile.phone,
    isSuperAdmin: profile.isSuperAdmin || session.role === "super_admin",
  };
}
