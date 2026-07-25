import "server-only";

import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase/server";
import {
  canRolesMessage,
  pairNeedsAgeGate,
  primaryMessagingRole,
  studentMeetsAgeGate,
  type MessagingRole,
} from "@/lib/messaging/permissions";

export type MessagingUser = {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  messagingRole: MessagingRole;
};

export type ParticipantIdentity = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: MessagingRole | null;
};

function displayName(p: { displayName: string | null; fullName: string | null; email: string }): string {
  return p.displayName?.trim() || p.fullName?.trim() || p.email.split("@")[0] || "Member";
}

function resolveRole(profile: { isAdmin: boolean; isSuperAdmin: boolean; userRoles: { role: string }[] }): MessagingRole | null {
  const roles = profile.userRoles.map((r) => r.role);
  if (profile.isSuperAdmin || profile.isAdmin || roles.includes("super_admin")) return "admin";
  return primaryMessagingRole(roles);
}

/** The signed-in user, resolved to their messaging role. Null if not signed in / no role. */
export async function getMessagingUser(): Promise<MessagingUser | null> {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: authUser.id },
    include: { userRoles: { where: { status: "active" } } },
  });
  if (!profile) return null;

  const messagingRole = resolveRole(profile);
  if (!messagingRole) return null;

  return {
    userId: profile.id,
    email: profile.email,
    name: displayName(profile),
    roles: profile.userRoles.map((r) => r.role),
    messagingRole,
  };
}

/** Messaging role for an arbitrary user id (for authorization checks). */
export async function messagingRoleFor(userId: string): Promise<MessagingRole | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: { userRoles: { where: { status: "active" } } },
  });
  if (!profile) return null;
  return resolveRole(profile);
}

/** Name + avatar for a set of user ids (students fall back to their photo). */
export async function getParticipantIdentities(userIds: string[]): Promise<Map<string, ParticipantIdentity>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Map();

  const profiles = await prisma.profile.findMany({
    where: { id: { in: ids } },
    include: { userRoles: { where: { status: "active" } } },
  });
  const students = await prisma.student.findMany({
    where: { studentUserId: { in: ids } },
    select: { studentUserId: true, profilePhotoUrl: true },
  });
  const studentPhoto = new Map(students.map((s) => [s.studentUserId!, s.profilePhotoUrl] as const));

  const map = new Map<string, ParticipantIdentity>();
  for (const p of profiles) {
    map.set(p.id, {
      userId: p.id,
      name: displayName(p),
      avatarUrl: p.avatarUrl ?? studentPhoto.get(p.id) ?? null,
      role: resolveRole(p),
    });
  }
  return map;
}

export type AuthorizeResult = { ok: true } | { ok: false; reason: string };

/**
 * Can `initiator` START a conversation with `recipientId`? Enforces the role
 * matrix + the donor→student age gate and opt-in. The opt-in is only required
 * when a DONOR initiates to a student (a student initiating consents implicitly).
 */
export async function authorizeStartConversation(
  initiator: MessagingUser,
  recipientId: string,
): Promise<AuthorizeResult> {
  if (recipientId === initiator.userId) return { ok: false, reason: "You can't message yourself." };

  const recipientRole = await messagingRoleFor(recipientId);
  if (!recipientRole) return { ok: false, reason: "That user can't receive messages." };
  if (!canRolesMessage(initiator.messagingRole, recipientRole)) {
    return { ok: false, reason: "Your account type can't message that user." };
  }

  if (pairNeedsAgeGate(initiator.messagingRole, recipientRole)) {
    const studentUserId = initiator.messagingRole === "student" ? initiator.userId : recipientId;
    const donorIsInitiator = initiator.messagingRole === "donor";
    const student = await prisma.student.findFirst({
      where: { studentUserId },
      select: { ageVerified: true, birthDate: true, allowDonorMessages: true, studentUserId: true },
    });
    if (!student) return { ok: false, reason: "Student record not found." };
    if (!studentMeetsAgeGate({ ageVerified: student.ageVerified, birthDate: student.birthDate, hasLoginAccount: Boolean(student.studentUserId) })) {
      return { ok: false, reason: "Donor–student messaging is limited to students 16 and older." };
    }
    if (donorIsInitiator && !student.allowDonorMessages) {
      return { ok: false, reason: "This student hasn't enabled donor messages." };
    }
  }

  return { ok: true };
}

/** Is `userId` a participant of `conversationId`? */
export async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  const row = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { id: true },
  });
  return Boolean(row);
}
