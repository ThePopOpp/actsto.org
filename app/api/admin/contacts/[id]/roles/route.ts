import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { ensureRoleScaffold } from "@/lib/auth/account-types";
import { prisma } from "@/lib/prisma";
import { createServiceClient } from "@/lib/supabase/server";
import { toContactDTO } from "@/lib/contacts/server";

export const dynamic = "force-dynamic";

const ASSIGNABLE = ["parent", "student", "donor_individual", "donor_business"] as const;
type AssignableRole = (typeof ASSIGNABLE)[number];

/**
 * Add or remove a role on a contact. Adding a role makes the contact a platform
 * user (role-specific profile scaffolded); a non-user contact gets an auth user
 * created (email required) so they flow into the Users list.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const body = (await request.json().catch(() => null)) as { role?: string; action?: string } | null;
  const role = body?.role as AssignableRole | undefined;
  const action = body?.action === "remove" ? "remove" : "add";
  if (!role || !ASSIGNABLE.includes(role)) {
    return NextResponse.json({ error: "A valid role is required." }, { status: 400 });
  }

  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "remove") {
    if (contact.userId) {
      await prisma.userRoleRecord.updateMany({ where: { userId: contact.userId, role, status: "active" }, data: { status: "inactive" } });
    }
    const fresh = await prisma.contact.findUnique({ where: { id } });
    return NextResponse.json({ ok: true, contact: fresh ? toContactDTO(fresh) : null });
  }

  // ADD — resolve a userId, creating a user if needed.
  let userId = contact.userId;
  let contactId = id;

  if (!userId) {
    const email = contact.email?.trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Add an email to this contact before assigning a role (a login is created from it)." }, { status: 400 });

    const existingProfile = await prisma.profile.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const supabase = createServiceClient();
      const created = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.displayName || email },
      });
      if (created.error || !created.data.user) {
        return NextResponse.json({ error: `Could not create the user: ${created.error?.message ?? "unknown error"}` }, { status: 500 });
      }
      userId = created.data.user.id;
      // A Supabase auth trigger may auto-create the profile (and thus a contact); upsert safely.
      await prisma.profile.upsert({
        where: { id: userId },
        create: { id: userId, email, firstName: contact.firstName, lastName: contact.lastName, displayName: contact.displayName, activeAccountType: role, primaryAccountType: role },
        update: { activeAccountType: role },
      });
    }

    // Link this contact to the user — or merge if a synced contact already exists.
    const synced = await prisma.contact.findUnique({ where: { userId } });
    if (synced && synced.id !== id) {
      await prisma.contact.update({
        where: { id: synced.id },
        data: {
          firstName: synced.firstName ?? contact.firstName,
          lastName: synced.lastName ?? contact.lastName,
          displayName: synced.displayName ?? contact.displayName,
          phone: synced.phone ?? contact.phone,
          avatarUrl: synced.avatarUrl ?? contact.avatarUrl,
          logoUrl: synced.logoUrl ?? contact.logoUrl,
          notes: synced.notes ?? contact.notes,
          tags: synced.tags.length ? synced.tags : contact.tags,
          stage: contact.stage,
        },
      });
      await prisma.contact.delete({ where: { id } }).catch(() => null);
      contactId = synced.id;
    } else {
      await prisma.contact.update({ where: { id }, data: { userId } });
    }
  }

  await ensureRoleScaffold(userId, role);

  const fresh = await prisma.contact.findUnique({ where: { id: contactId } });
  const roles = fresh?.userId
    ? (await prisma.userRoleRecord.findMany({ where: { userId: fresh.userId, status: "active" }, select: { role: true } })).map((r) => r.role)
    : undefined;
  return NextResponse.json({ ok: true, contact: fresh ? toContactDTO(fresh, roles) : null });
}
