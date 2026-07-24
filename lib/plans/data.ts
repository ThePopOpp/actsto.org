import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  Plan,
  PlanGroup,
  PlanLabel,
  PlanMember,
  PlanMemberRole,
  PlanPerson,
  PlanSummary,
  PlanTaskDetail,
  PlanView,
  PlanWorkspaceData,
  TaskPriority,
  TaskStatus,
} from "@/lib/plans/types";

export type PlanActor = { email: string; name: string; role: string };
const isAdmin = (a: PlanActor) => a.role === "super_admin";

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

type PlanRow = Prisma.PlanGetPayload<object>;
type GroupRow = Prisma.PlanGroupGetPayload<object>;
type LabelRow = Prisma.PlanLabelGetPayload<object>;
type TaskRow = Prisma.PlanTaskGetPayload<{ include: { assignees: true; taskLabels: true; checklist: true } }>;

function toPlan(r: PlanRow): Plan {
  return {
    id: r.id,
    ownerEmail: r.ownerEmail,
    ownerName: r.ownerName,
    name: r.name,
    description: r.description,
    color: r.color,
    icon: r.icon,
    defaultView: r.defaultView as PlanView,
    status: r.status as Plan["status"],
    visibility: r.visibility as Plan["visibility"],
    startDate: iso(r.startDate),
    targetDate: iso(r.targetDate),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    archivedAt: iso(r.archivedAt),
  };
}
function toGroup(r: GroupRow): PlanGroup {
  return { id: r.id, planId: r.planId, name: r.name, color: r.color, position: r.position };
}
function toLabel(r: LabelRow): PlanLabel {
  return { id: r.id, planId: r.planId, name: r.name, color: r.color, position: r.position };
}
function toTask(r: TaskRow): PlanTaskDetail {
  return {
    id: r.id,
    planId: r.planId,
    groupId: r.groupId,
    title: r.title,
    description: r.description,
    notes: r.notes,
    status: r.status as TaskStatus,
    priority: r.priority as TaskPriority,
    progress: r.progress,
    startDate: iso(r.startDate),
    dueDate: iso(r.dueDate),
    isMilestone: r.isMilestone,
    position: r.position,
    completedAt: iso(r.completedAt),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    assignees: r.assignees.map((a) => ({ email: a.email, name: a.name })),
    labelIds: r.taskLabels.map((t) => t.labelId),
    checklist: [...r.checklist]
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, taskId: c.taskId, title: c.title, isComplete: c.isComplete, position: c.position })),
  };
}

/** Plans the actor owns or is a member of. */
export async function listPlans(actor: PlanActor): Promise<PlanSummary[]> {
  const where: Prisma.PlanWhereInput = isAdmin(actor)
    ? {}
    : { OR: [{ ownerEmail: { equals: actor.email, mode: "insensitive" } }, { members: { some: { email: { equals: actor.email, mode: "insensitive" } } } }] };

  const rows = await prisma.plan.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { members: true, tasks: true } },
      tasks: { where: { status: "complete" }, select: { id: true } },
    },
  });

  return rows.map((r) => ({
    ...toPlan(r),
    taskCount: r._count.tasks,
    completedCount: r.tasks.length,
    memberCount: r._count.members,
    canManage: isAdmin(actor) || r.ownerEmail.toLowerCase() === actor.email.toLowerCase(),
  }));
}

async function getPeople(): Promise<PlanPerson[]> {
  const rows = await prisma.profile.findMany({
    orderBy: { displayName: "asc" },
    take: 200,
    select: { email: true, displayName: true, fullName: true },
  });
  return rows.map((r) => ({ email: r.email, name: r.displayName || r.fullName || r.email }));
}

export async function getWorkspace(planId: string, actor: PlanActor): Promise<PlanWorkspaceData | null> {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, include: { members: true } });
  if (!plan) return null;

  const owner = isAdmin(actor) || plan.ownerEmail.toLowerCase() === actor.email.toLowerCase();
  const member = plan.members.find((m) => m.email.toLowerCase() === actor.email.toLowerCase());
  if (!owner && !member) return null;

  const canManage = owner;
  const canEdit = owner || (member ? member.role !== "viewer" : false);

  const [groups, labels, tasks, people] = await Promise.all([
    prisma.planGroup.findMany({ where: { planId }, orderBy: { position: "asc" } }),
    prisma.planLabel.findMany({ where: { planId }, orderBy: { position: "asc" } }),
    prisma.planTask.findMany({ where: { planId }, orderBy: { position: "asc" }, include: { assignees: true, taskLabels: true, checklist: true } }),
    getPeople(),
  ]);

  const members: PlanMember[] = plan.members.map((m) => ({ id: m.id, planId: m.planId, email: m.email, name: m.name, role: m.role as PlanMemberRole }));

  return {
    plan: toPlan(plan),
    groups: groups.map(toGroup),
    labels: labels.map(toLabel),
    tasks: tasks.map(toTask),
    members,
    people,
    access: { canView: true, canEdit, canManage },
  };
}

/** Authorization gate for mutations. Returns the plan row if the actor may edit. */
export async function requirePlanEdit(planId: string, actor: PlanActor) {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, include: { members: true } });
  if (!plan) return null;
  const owner = isAdmin(actor) || plan.ownerEmail.toLowerCase() === actor.email.toLowerCase();
  const member = plan.members.find((m) => m.email.toLowerCase() === actor.email.toLowerCase());
  if (!owner && (!member || member.role === "viewer")) return null;
  return { plan, canManage: owner };
}
