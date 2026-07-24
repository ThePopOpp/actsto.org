import "server-only";

import { prisma } from "@/lib/prisma";
import { DEFAULT_SCRATCH_GROUPS } from "@/lib/plans/constants";
import { requirePlanEdit, type PlanActor } from "@/lib/plans/data";
import type { TaskInput } from "@/lib/plans/types";

function toDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ── Plans ─────────────────────────────────────────────────────────────────────
export async function createPlan(
  actor: PlanActor,
  input: { name: string; description?: string; color?: string; icon?: string; defaultView?: string },
): Promise<string> {
  const plan = await prisma.plan.create({
    data: {
      ownerEmail: actor.email.toLowerCase(),
      ownerName: actor.name,
      name: input.name.trim() || "Untitled plan",
      description: input.description?.trim() || null,
      color: input.color || "gold",
      icon: input.icon || "clipboard-list",
      defaultView: input.defaultView || "board",
      groups: { create: DEFAULT_SCRATCH_GROUPS.map((g, i) => ({ name: g.name, position: i })) },
    },
  });
  return plan.id;
}

export async function updatePlan(
  planId: string,
  patch: Partial<{ name: string; description: string | null; color: string; icon: string; defaultView: string; status: string; visibility: string; startDate: string | null; targetDate: string | null }>,
  actor: PlanActor,
): Promise<void> {
  const gate = await requirePlanEdit(planId, actor);
  if (!gate) throw new Error("Not authorized.");
  await prisma.plan.update({
    where: { id: planId },
    data: {
      name: patch.name?.trim() || undefined,
      description: patch.description === undefined ? undefined : patch.description,
      color: patch.color || undefined,
      icon: patch.icon || undefined,
      defaultView: patch.defaultView || undefined,
      status: patch.status || undefined,
      visibility: patch.visibility || undefined,
      startDate: patch.startDate === undefined ? undefined : toDate(patch.startDate),
      targetDate: patch.targetDate === undefined ? undefined : toDate(patch.targetDate),
      archivedAt: patch.status === "archived" ? new Date() : patch.status === "active" ? null : undefined,
    },
  });
}

export async function deletePlan(planId: string, actor: PlanActor): Promise<void> {
  const gate = await requirePlanEdit(planId, actor);
  if (!gate || !gate.canManage) throw new Error("Only the owner can delete this plan.");
  await prisma.plan.delete({ where: { id: planId } });
}

// ── Groups ────────────────────────────────────────────────────────────────────
export async function createGroup(planId: string, name: string, actor: PlanActor): Promise<void> {
  const gate = await requirePlanEdit(planId, actor);
  if (!gate) throw new Error("Not authorized.");
  const count = await prisma.planGroup.count({ where: { planId } });
  await prisma.planGroup.create({ data: { planId, name: name.trim() || "New group", position: count } });
}

export async function updateGroup(groupId: string, patch: { name?: string; color?: string | null }, actor: PlanActor): Promise<void> {
  const group = await prisma.planGroup.findUnique({ where: { id: groupId }, select: { planId: true } });
  if (!group) throw new Error("Group not found.");
  const gate = await requirePlanEdit(group.planId, actor);
  if (!gate) throw new Error("Not authorized.");
  await prisma.planGroup.update({ where: { id: groupId }, data: { name: patch.name?.trim() || undefined, color: patch.color === undefined ? undefined : patch.color } });
}

export async function deleteGroup(groupId: string, actor: PlanActor): Promise<void> {
  const group = await prisma.planGroup.findUnique({ where: { id: groupId }, select: { planId: true } });
  if (!group) return;
  const gate = await requirePlanEdit(group.planId, actor);
  if (!gate) throw new Error("Not authorized.");
  await prisma.planGroup.delete({ where: { id: groupId } });
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export async function createTask(planId: string, input: { title: string; groupId?: string | null }, actor: PlanActor): Promise<string> {
  const gate = await requirePlanEdit(planId, actor);
  if (!gate) throw new Error("Not authorized.");
  const groupId = input.groupId ?? null;
  const count = await prisma.planTask.count({ where: { planId, groupId } });
  const task = await prisma.planTask.create({ data: { planId, groupId, title: input.title.trim() || "New task", position: count } });
  return task.id;
}

export async function updateTask(taskId: string, input: TaskInput, actor: PlanActor): Promise<void> {
  const task = await prisma.planTask.findUnique({ where: { id: taskId }, select: { planId: true } });
  if (!task) throw new Error("Task not found.");
  const gate = await requirePlanEdit(task.planId, actor);
  if (!gate) throw new Error("Not authorized.");

  const becomingComplete = input.status === "complete";
  await prisma.planTask.update({
    where: { id: taskId },
    data: {
      title: input.title?.trim() || undefined,
      groupId: input.groupId === undefined ? undefined : input.groupId,
      description: input.description === undefined ? undefined : input.description,
      notes: input.notes === undefined ? undefined : input.notes,
      status: input.status || undefined,
      priority: input.priority || undefined,
      progress: input.progress === undefined ? undefined : Math.max(0, Math.min(100, input.progress)),
      startDate: input.startDate === undefined ? undefined : toDate(input.startDate),
      dueDate: input.dueDate === undefined ? undefined : toDate(input.dueDate),
      isMilestone: input.isMilestone === undefined ? undefined : input.isMilestone,
      completedAt: input.status === undefined ? undefined : becomingComplete ? new Date() : null,
    },
  });

  if (input.assignees) {
    await prisma.planTaskAssignee.deleteMany({ where: { taskId } });
    const seen = new Set<string>();
    const rows = input.assignees
      .filter((a) => a.email && !seen.has(a.email.toLowerCase()) && seen.add(a.email.toLowerCase()))
      .map((a) => ({ taskId, email: a.email, name: a.name ?? null }));
    if (rows.length) await prisma.planTaskAssignee.createMany({ data: rows });
  }

  if (input.labelIds) {
    await prisma.planTaskLabel.deleteMany({ where: { taskId } });
    if (input.labelIds.length) {
      await prisma.planTaskLabel.createMany({ data: input.labelIds.map((labelId) => ({ taskId, labelId })), skipDuplicates: true });
    }
  }

  if (input.checklist) {
    await prisma.planChecklistItem.deleteMany({ where: { taskId } });
    if (input.checklist.length) {
      await prisma.planChecklistItem.createMany({
        data: input.checklist.map((c, i) => ({ taskId, title: c.title.trim() || "Item", isComplete: c.isComplete, position: i })),
      });
    }
  }
}

export async function deleteTask(taskId: string, actor: PlanActor): Promise<void> {
  const task = await prisma.planTask.findUnique({ where: { id: taskId }, select: { planId: true } });
  if (!task) return;
  const gate = await requirePlanEdit(task.planId, actor);
  if (!gate) throw new Error("Not authorized.");
  await prisma.planTask.delete({ where: { id: taskId } });
}

export async function moveTask(taskId: string, targetGroupId: string | null, targetIndex: number, actor: PlanActor): Promise<void> {
  const task = await prisma.planTask.findUnique({ where: { id: taskId }, select: { planId: true } });
  if (!task) throw new Error("Task not found.");
  const gate = await requirePlanEdit(task.planId, actor);
  if (!gate) throw new Error("Not authorized.");

  const siblings = await prisma.planTask.findMany({
    where: { planId: task.planId, groupId: targetGroupId, id: { not: taskId } },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const ordered = siblings.map((s) => s.id);
  const idx = Math.max(0, Math.min(targetIndex, ordered.length));
  ordered.splice(idx, 0, taskId);

  await prisma.$transaction([
    prisma.planTask.update({ where: { id: taskId }, data: { groupId: targetGroupId } }),
    ...ordered.map((id, i) => prisma.planTask.update({ where: { id }, data: { position: i } })),
  ]);
}
