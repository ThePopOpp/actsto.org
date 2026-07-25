"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flag,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Plus,
  Table as TableIcon,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PLAN_VIEWS, TASK_PRIORITIES, TASK_STATUSES, planColor, planIcon, taskPriority, taskStatus } from "@/lib/plans/constants";
import type { PlanTaskDetail, PlanView, PlanWorkspaceData, TaskInput } from "@/lib/plans/types";
import { cn } from "@/lib/utils";

const VIEW_ICON: Record<PlanView, React.ComponentType<{ className?: string }>> = {
  board: LayoutGrid,
  grid: TableIcon,
  list: ListIcon,
  calendar: CalendarDays,
};

function fmtDate(v: string | null): string {
  if (!v) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(v));
}
function dateInput(v: string | null): string {
  return v ? new Date(v).toISOString().slice(0, 10) : "";
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name || "?").slice(0, 2).toUpperCase();
}

export function PlanWorkspace({ planId }: { planId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PlanWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<PlanView>("board");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/plans/${planId}`, { cache: "no-store" });
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as { workspace?: PlanWorkspaceData } | null;
    if (res.ok && json?.workspace) {
      setData(json.workspace);
      setView((v) => (loading ? json.workspace!.plan.defaultView : v));
    }
    setLoading(false);
  }, [planId, loading]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const api = useMemo(
    () => ({
      async createTask(title: string, groupId: string | null) {
        await fetch(`/api/plans/${planId}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, groupId }) });
        await load();
      },
      async patchTask(taskId: string, patch: TaskInput) {
        await fetch(`/api/plans/${planId}/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
        await load();
      },
      async deleteTask(taskId: string) {
        await fetch(`/api/plans/${planId}/tasks/${taskId}`, { method: "DELETE" });
        await load();
      },
      async moveTask(taskId: string, groupId: string | null, index: number) {
        await fetch(`/api/plans/${planId}/tasks/${taskId}/move`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId, index }) });
        await load();
      },
      async addGroup(name: string) {
        await fetch(`/api/plans/${planId}/groups`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
        await load();
      },
      async renameGroup(groupId: string, name: string) {
        await fetch(`/api/plans/${planId}/groups/${groupId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
        await load();
      },
      async deleteGroup(groupId: string) {
        await fetch(`/api/plans/${planId}/groups/${groupId}`, { method: "DELETE" });
        await load();
      },
      async deletePlan() {
        await fetch(`/api/plans/${planId}`, { method: "DELETE" });
        router.push("/dashboard/admin/plans");
      },
    }),
    [planId, load, router],
  );

  if (loading) return <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading…</p>;
  if (notFound || !data) return <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Plan not found or you don&apos;t have access.</p>;

  const { plan, groups, tasks, people, labels, access } = data;
  const Icon = planIcon(plan.icon);
  const color = planColor(plan.color);
  const selected = tasks.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => router.push("/dashboard/admin/plans")}>
            <ArrowLeft className="mr-1.5 size-4" /> All plans
          </Button>
          <div className={cn("flex size-9 items-center justify-center rounded-lg", color.swatch)}>
            <Icon className="size-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-semibold text-primary">{plan.name}</h1>
            {plan.description ? <p className="text-xs text-muted-foreground">{plan.description}</p> : null}
          </div>
        </div>
        {access.canManage ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (window.confirm(`Delete "${plan.name}"? This removes all its tasks.`)) void api.deletePlan();
            }}
          >
            <Trash2 className="mr-1.5 size-4" /> Delete plan
          </Button>
        ) : null}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
          {PLAN_VIEWS.map((v) => {
            const VIcon = VIEW_ICON[v.value];
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => setView(v.value)}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", view === v.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
              >
                <VIcon className="size-4" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}
        </div>
        {access.canEdit ? (
          <div className="flex items-center gap-2">
            {addingGroup ? (
              <GroupAddInline onAdd={(name) => { void api.addGroup(name); setAddingGroup(false); }} onCancel={() => setAddingGroup(false)} />
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setAddingGroup(true)}>
                <Plus className="mr-1.5 size-4" /> Add group
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* Views */}
      {view === "board" && <BoardView data={data} api={api} canEdit={access.canEdit} onOpen={setSelectedId} />}
      {view === "grid" && <GridView tasks={tasks} groups={groups} onOpen={setSelectedId} />}
      {view === "list" && <ListView data={data} api={api} canEdit={access.canEdit} onOpen={setSelectedId} />}
      {view === "calendar" && <CalendarView tasks={tasks} onOpen={setSelectedId} />}

      {/* Task drawer */}
      <Sheet open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
          {selected ? (
            <TaskDrawer
              key={selected.id}
              task={selected}
              groups={groups}
              labels={labels}
              people={people}
              canEdit={access.canEdit}
              onClose={() => setSelectedId(null)}
              onSave={async (patch) => { await api.patchTask(selected.id, patch); }}
              onDelete={async () => { await api.deleteTask(selected.id); setSelectedId(null); }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

type PlanApi = {
  createTask: (title: string, groupId: string | null) => Promise<void>;
  patchTask: (taskId: string, patch: TaskInput) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, groupId: string | null, index: number) => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  renameGroup: (groupId: string, name: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  deletePlan: () => Promise<void>;
};

// ── Board (Kanban) ─────────────────────────────────────────────────────────────
function BoardView({ data, api, canEdit, onOpen }: { data: PlanWorkspaceData; api: PlanApi; canEdit: boolean; onOpen: (id: string) => void }) {
  const { groups, tasks } = data;
  const [dragId, setDragId] = useState<string | null>(null);
  const ungrouped = tasks.filter((t) => !t.groupId);
  const columns = [...groups.map((g) => ({ id: g.id as string | null, name: g.name, tasks: tasks.filter((t) => t.groupId === g.id) }))];
  if (ungrouped.length) columns.push({ id: null, name: "Ungrouped", tasks: ungrouped });

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((col) => {
        const done = col.tasks.filter((t) => t.status === "complete").length;
        return (
          <div
            key={col.id ?? "none"}
            onDragOver={(e) => canEdit && e.preventDefault()}
            onDrop={() => {
              if (dragId && canEdit) void api.moveTask(dragId, col.id, col.tasks.length);
              setDragId(null);
            }}
            className="flex w-72 shrink-0 flex-col rounded-lg border border-border/70 bg-muted/20"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
              <div className="flex items-center gap-2">
                {col.id ? (
                  <GroupHeader name={col.name} canEdit={canEdit} onRename={(n) => void api.renameGroup(col.id as string, n)} onDelete={() => void api.deleteGroup(col.id as string)} />
                ) : (
                  <span className="text-sm font-semibold text-foreground">{col.name}</span>
                )}
                <span className="text-xs text-muted-foreground">{done}/{col.tasks.length}</span>
              </div>
            </div>
            <div className="flex min-h-[80px] flex-1 flex-col gap-2 p-2">
              {col.tasks.map((t) => (
                <TaskCard key={t.id} task={t} draggable={canEdit} onDragStart={() => setDragId(t.id)} onOpen={() => onOpen(t.id)} />
              ))}
              {canEdit ? <InlineAddTask onAdd={(title) => void api.createTask(title, col.id)} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GroupHeader({ name, canEdit, onRename, onDelete }: { name: string; canEdit: boolean; onRename: (n: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => { setEditing(false); if (value.trim() && value !== name) onRename(value.trim()); }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setValue(name); setEditing(false); } }}
        className="w-32 rounded border border-border bg-background px-1.5 py-0.5 text-sm font-semibold"
      />
    );
  }
  return (
    <span className="group/g inline-flex items-center gap-1">
      <button type="button" disabled={!canEdit} onClick={() => setEditing(true)} className="text-sm font-semibold text-foreground disabled:cursor-default">
        {name}
      </button>
      {canEdit ? (
        <button type="button" onClick={() => { if (window.confirm(`Delete group "${name}"? Its tasks move to Ungrouped.`)) onDelete(); }} className="hidden text-muted-foreground hover:text-destructive group-hover/g:inline" aria-label="Delete group">
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}

function TaskCard({ task, draggable, onDragStart, onOpen }: { task: PlanTaskDetail; draggable: boolean; onDragStart: () => void; onOpen: () => void }) {
  const st = taskStatus(task.status);
  const pr = taskPriority(task.priority);
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onOpen}
      className="w-full rounded-lg border border-border/70 bg-card p-2.5 text-left transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start gap-2">
        {task.isMilestone ? <Flag className="mt-0.5 size-3.5 shrink-0 text-amber-500" /> : null}
        <p className={cn("flex-1 text-sm font-medium", task.status === "complete" ? "text-muted-foreground line-through" : "text-foreground")}>{task.title}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", st.chip)}>
          <span className={cn("size-1.5 rounded-full", st.dot)} /> {st.label}
        </span>
        {task.priority !== "medium" ? <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", pr.chip)}>{pr.label}</span> : null}
        {task.dueDate ? <span className="text-[10px] text-muted-foreground">{fmtDate(task.dueDate)}</span> : null}
      </div>
      {task.assignees.length > 0 ? (
        <div className="mt-2 flex -space-x-1.5">
          {task.assignees.slice(0, 4).map((a) => (
            <span key={a.email} title={a.name ?? a.email} className="flex size-5 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground ring-2 ring-card">
              {initials(a.name ?? a.email)}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}

function InlineAddTask({ onAdd }: { onAdd: (title: string) => void }) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState("");
  if (!active) {
    return (
      <button type="button" onClick={() => setActive(true)} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
        <Plus className="size-3.5" /> Add task
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { if (value.trim()) onAdd(value.trim()); setActive(false); setValue(""); }}
      onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) { onAdd(value.trim()); setValue(""); } if (e.key === "Escape") { setActive(false); setValue(""); } }}
      placeholder="Task title…"
      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
    />
  );
}

function GroupAddInline({ onAdd, onCancel }: { onAdd: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState("");
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { if (value.trim()) onAdd(value.trim()); else onCancel(); }}
      onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) onAdd(value.trim()); if (e.key === "Escape") onCancel(); }}
      placeholder="Group name…"
      className="h-9 w-40 rounded-md border border-border bg-background px-2 text-sm"
    />
  );
}

// ── Grid (Table) ────────────────────────────────────────────────────────────────
function GridView({ tasks, groups, onOpen }: { tasks: PlanTaskDetail[]; groups: PlanWorkspaceData["groups"]; onOpen: (id: string) => void }) {
  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? "—";
  return (
    <div className="overflow-x-auto rounded-lg border border-border/80">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">Task</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Priority</th>
            <th className="px-3 py-2 font-semibold">Group</th>
            <th className="px-3 py-2 font-semibold">Due</th>
            <th className="px-3 py-2 font-semibold">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {tasks.length === 0 ? (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No tasks yet.</td></tr>
          ) : (
            tasks.map((t) => {
              const st = taskStatus(t.status);
              const pr = taskPriority(t.priority);
              return (
                <tr key={t.id} className="cursor-pointer hover:bg-muted/20" onClick={() => onOpen(t.id)}>
                  <td className="px-3 py-2">
                    <span className={cn("font-medium", t.status === "complete" ? "text-muted-foreground line-through" : "text-foreground")}>{t.title}</span>
                    {t.isMilestone ? <Flag className="ml-1.5 inline size-3.5 text-amber-500" /> : null}
                  </td>
                  <td className="px-3 py-2"><span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", st.chip)}>{st.label}</span></td>
                  <td className="px-3 py-2"><span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", pr.chip)}>{pr.label}</span></td>
                  <td className="px-3 py-2 text-muted-foreground">{groupName(t.groupId)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{t.dueDate ? fmtDate(t.dueDate) : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${t.progress}%` }} /></div>
                      <span className="text-xs tabular-nums text-muted-foreground">{t.progress}%</span>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── List ────────────────────────────────────────────────────────────────────────
function ListView({ data, api, canEdit, onOpen }: { data: PlanWorkspaceData; api: PlanApi; canEdit: boolean; onOpen: (id: string) => void }) {
  const { groups, tasks } = data;
  const cols = [...groups.map((g) => ({ id: g.id as string | null, name: g.name })), ...(tasks.some((t) => !t.groupId) ? [{ id: null, name: "Ungrouped" }] : [])];
  return (
    <div className="space-y-4">
      {cols.map((col) => {
        const list = tasks.filter((t) => t.groupId === col.id);
        return (
          <div key={col.id ?? "none"}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.name} · {list.length}</p>
            <div className="divide-y divide-border/60 rounded-lg border border-border/70">
              {list.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">No tasks.</p>
              ) : (
                list.map((t) => {
                  const st = taskStatus(t.status);
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-3 py-2">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => void api.patchTask(t.id, { status: t.status === "complete" ? "not_started" : "complete" })}
                        className={cn("flex size-4 items-center justify-center rounded-full border", t.status === "complete" ? "border-emerald-500 bg-emerald-500 text-white" : "border-border")}
                        aria-label="Toggle complete"
                      >
                        {t.status === "complete" ? "✓" : ""}
                      </button>
                      <button type="button" onClick={() => onOpen(t.id)} className="flex-1 text-left">
                        <span className={cn("text-sm font-medium", t.status === "complete" ? "text-muted-foreground line-through" : "text-foreground")}>{t.title}</span>
                      </button>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", st.chip)}>{st.label}</span>
                      {t.dueDate ? <span className="text-xs text-muted-foreground">{fmtDate(t.dueDate)}</span> : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Calendar ─────────────────────────────────────────────────────────────────────
function CalendarView({ tasks, onOpen }: { tasks: PlanTaskDetail[]; onOpen: (id: string) => void }) {
  const dated = tasks.filter((t) => t.dueDate);
  const first = dated.length ? new Date(dated[0].dueDate as string) : new Date(2026, 6, 1);
  const [month, setMonth] = useState({ y: first.getFullYear(), m: first.getMonth() });
  const firstOfMonth = new Date(month.y, month.m, 1);
  const startDay = firstOfMonth.getDay();
  const days = new Date(month.y, month.m + 1, 0).getDate();
  const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(firstOfMonth);
  const byDay = new Map<number, PlanTaskDetail[]>();
  for (const t of dated) {
    const d = new Date(t.dueDate as string);
    if (d.getFullYear() === month.y && d.getMonth() === month.m) byDay.set(d.getDate(), [...(byDay.get(d.getDate()) ?? []), t]);
  }
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(d);

  return (
    <div className="rounded-lg border border-border/80 p-3">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setMonth((m) => ({ y: m.m === 0 ? m.y - 1 : m.y, m: m.m === 0 ? 11 : m.m - 1 }))} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><ChevronLeft className="size-4" /></button>
        <span className="font-heading text-sm font-semibold text-primary">{label}</span>
        <button type="button" onClick={() => setMonth((m) => ({ y: m.m === 11 ? m.y + 1 : m.y, m: m.m === 11 ? 0 : m.m + 1 }))} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><ChevronRight className="size-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className={cn("min-h-[76px] rounded-md border p-1", day ? "border-border/60 bg-background" : "border-transparent")}>
            {day ? (
              <>
                <span className="text-xs text-muted-foreground">{day}</span>
                <div className="mt-0.5 space-y-0.5">
                  {(byDay.get(day) ?? []).map((t) => {
                    const st = taskStatus(t.status);
                    return (
                      <button key={t.id} type="button" onClick={() => onOpen(t.id)} className={cn("block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium", st.chip)} title={t.title}>
                        {t.title}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Task drawer ──────────────────────────────────────────────────────────────────
function TaskDrawer({
  task,
  groups,
  labels,
  people,
  canEdit,
  onClose,
  onSave,
  onDelete,
}: {
  task: PlanTaskDetail;
  groups: PlanWorkspaceData["groups"];
  labels: PlanWorkspaceData["labels"];
  people: PlanWorkspaceData["people"];
  canEdit: boolean;
  onClose: () => void;
  onSave: (patch: TaskInput) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [t, setT] = useState<PlanTaskDetail>(task);
  const [busy, setBusy] = useState(false);
  const [newItem, setNewItem] = useState("");
  const set = (p: Partial<PlanTaskDetail>) => setT((prev) => ({ ...prev, ...p }));

  async function save() {
    setBusy(true);
    await onSave({
      title: t.title,
      groupId: t.groupId,
      description: t.description,
      notes: t.notes,
      status: t.status,
      priority: t.priority,
      progress: t.progress,
      startDate: t.startDate,
      dueDate: t.dueDate,
      isMilestone: t.isMilestone,
      assignees: t.assignees,
      labelIds: t.labelIds,
      checklist: t.checklist.map((c) => ({ id: c.id, title: c.title, isComplete: c.isComplete })),
    });
    setBusy(false);
    onClose();
  }

  const toggleAssignee = (email: string, name: string) => {
    set({ assignees: t.assignees.some((a) => a.email === email) ? t.assignees.filter((a) => a.email !== email) : [...t.assignees, { email, name }] });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit task</p>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Textarea value={t.title} disabled={!canEdit} onChange={(e) => set({ title: e.target.value })} className="min-h-[44px] resize-none font-heading text-base font-semibold" />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select value={t.status} onValueChange={(v) => set({ status: v as PlanTaskDetail["status"] })} disabled={!canEdit}>
              <SelectTrigger className="mt-0 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={t.priority} onValueChange={(v) => set({ priority: v as PlanTaskDetail["priority"] })} disabled={!canEdit}>
              <SelectTrigger className="mt-0 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Group">
          <Select value={t.groupId ?? "none"} onValueChange={(v) => set({ groupId: v === "none" ? null : v })} disabled={!canEdit}>
            <SelectTrigger className="mt-0 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ungrouped</SelectItem>
              {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date"><DatePicker value={dateInput(t.startDate)} onChange={(v) => set({ startDate: v || null })} placeholder="Pick a date" /></Field>
          <Field label="Due date"><DatePicker value={dateInput(t.dueDate)} onChange={(v) => set({ dueDate: v || null })} placeholder="Pick a date" /></Field>
        </div>

        <Field label={`Progress — ${t.progress}%`}>
          <input type="range" min={0} max={100} step={5} disabled={!canEdit} value={t.progress} onChange={(e) => set({ progress: Number(e.target.value) })} className="w-full" />
        </Field>

        <div>
          <Label className="text-xs text-muted-foreground">Assignees</Label>
          <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-md border border-border/60 p-1.5">
            {people.length === 0 ? <p className="px-1 text-xs text-muted-foreground">No dashboard users found.</p> : people.map((p) => (
              <label key={p.email} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted">
                <input type="checkbox" disabled={!canEdit} checked={t.assignees.some((a) => a.email === p.email)} onChange={() => toggleAssignee(p.email, p.name)} className="size-3.5" />
                <span className="truncate">{p.name}</span>
              </label>
            ))}
          </div>
        </div>

        {labels.length > 0 ? (
          <div>
            <Label className="text-xs text-muted-foreground">Labels</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {labels.map((l) => {
                const on = t.labelIds.includes(l.id);
                return (
                  <button key={l.id} type="button" disabled={!canEdit} onClick={() => set({ labelIds: on ? t.labelIds.filter((x) => x !== l.id) : [...t.labelIds, l.id] })} className={cn("rounded-full border px-2 py-0.5 text-xs", on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                    {l.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div>
          <Label className="text-xs text-muted-foreground">Checklist</Label>
          <div className="mt-1 space-y-1">
            {t.checklist.map((c, i) => (
              <div key={c.id || i} className="flex items-center gap-2">
                <input type="checkbox" disabled={!canEdit} checked={c.isComplete} onChange={() => set({ checklist: t.checklist.map((x, j) => (j === i ? { ...x, isComplete: !x.isComplete } : x)) })} className="size-3.5" />
                <input value={c.title} disabled={!canEdit} onChange={(e) => set({ checklist: t.checklist.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className={cn("flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-border focus:border-border", c.isComplete && "text-muted-foreground line-through")} />
                {canEdit ? <button type="button" onClick={() => set({ checklist: t.checklist.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive"><X className="size-3.5" /></button> : null}
              </div>
            ))}
            {canEdit ? (
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newItem.trim()) { set({ checklist: [...t.checklist, { id: "", taskId: t.id, title: newItem.trim(), isComplete: false, position: t.checklist.length }] }); setNewItem(""); } }}
                placeholder="Add an item…"
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
              />
            ) : null}
          </div>
        </div>

        <Field label="Description"><Textarea disabled={!canEdit} value={t.description ?? ""} onChange={(e) => set({ description: e.target.value })} className="min-h-[70px]" /></Field>
        <Field label="Notes"><Textarea disabled={!canEdit} value={t.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} className="min-h-[56px]" /></Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={!canEdit} checked={t.isMilestone} onChange={(e) => set({ isMilestone: e.target.checked })} className="size-4" />
          <Flag className="size-4 text-amber-500" /> Mark as milestone
        </label>
      </div>

      {canEdit ? (
        <div className="flex items-center justify-between gap-2 border-t border-border p-4">
          <Button type="button" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => { if (window.confirm("Delete this task?")) void onDelete(); }}>
            <Trash2 className="mr-1.5 size-4" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null} Save
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
