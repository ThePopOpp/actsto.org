import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Append one row to admin_activity_logs. Eligibility overrides, allocations,
 * disbursements, cap and income-table edits and funding-source corrections all
 * come through here, so "who changed this, when, from what" always has an
 * answer. Never throws: a failed audit write must not undo the action, but it
 * is reported.
 */
export async function logAdminActivity(entry: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  let actorId = entry.actorId ?? null;
  if (!actorId && entry.actorEmail) {
    actorId =
      (
        await prisma.profile
          .findFirst({
            where: { email: { equals: entry.actorEmail, mode: "insensitive" } },
            select: { id: true },
          })
          .catch(() => null)
      )?.id ?? null;
  }

  const json = (value: unknown) =>
    value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);

  await prisma.adminActivityLog
    .create({
      data: {
        adminUserId: actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId && UUID.test(entry.entityId) ? entry.entityId : null,
        beforeData: json(entry.before),
        afterData: json({
          ...(entry.after && typeof entry.after === "object" ? entry.after : { value: entry.after }),
          ...(entry.actorEmail ? { _actorEmail: entry.actorEmail } : {}),
          ...(entry.entityId && !UUID.test(entry.entityId) ? { _entityKey: entry.entityId } : {}),
        }),
      },
    })
    .catch((error) => console.error("[audit] could not record", entry.action, error));
}
