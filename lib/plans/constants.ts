import {
  BookOpen,
  Briefcase,
  CalendarRange,
  CircleCheck,
  CircleDashed,
  CirclePause,
  CircleSlash,
  ClipboardList,
  FolderKanban,
  Hammer,
  LayoutGrid,
  Megaphone,
  Rocket,
  Sparkles,
  Target,
  Timer,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { PlanView, TaskPriority, TaskStatus } from "./types";

export const PLAN_COLORS = [
  { value: "gold", label: "Gold", swatch: "bg-amber-400", chip: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200" },
  { value: "navy", label: "Navy", swatch: "bg-[#001138]", chip: "bg-blue-100 text-blue-900 dark:bg-blue-400/15 dark:text-blue-200" },
  { value: "sky", label: "Sky", swatch: "bg-sky-400", chip: "bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200" },
  { value: "clay", label: "Clay", swatch: "bg-rose-400", chip: "bg-rose-100 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200" },
  { value: "green", label: "Green", swatch: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200" },
  { value: "plum", label: "Plum", swatch: "bg-purple-400", chip: "bg-purple-100 text-purple-900 dark:bg-purple-400/15 dark:text-purple-200" },
  { value: "slate", label: "Slate", swatch: "bg-slate-400", chip: "bg-slate-100 text-slate-800 dark:bg-slate-400/15 dark:text-slate-200" },
] as const;

export function planColor(value: string | null | undefined) {
  return PLAN_COLORS.find((c) => c.value === value) ?? PLAN_COLORS[0];
}

export const PLAN_ICONS: Array<{ value: string; icon: LucideIcon }> = [
  { value: "clipboard-list", icon: ClipboardList },
  { value: "folder-kanban", icon: FolderKanban },
  { value: "calendar-range", icon: CalendarRange },
  { value: "rocket", icon: Rocket },
  { value: "hammer", icon: Hammer },
  { value: "megaphone", icon: Megaphone },
  { value: "users-round", icon: UsersRound },
  { value: "target", icon: Target },
  { value: "briefcase", icon: Briefcase },
  { value: "book-open", icon: BookOpen },
  { value: "layout-grid", icon: LayoutGrid },
  { value: "sparkles", icon: Sparkles },
];

export function planIcon(value: string | null | undefined): LucideIcon {
  return PLAN_ICONS.find((i) => i.value === value)?.icon ?? ClipboardList;
}

export const TASK_STATUSES: Array<{ value: TaskStatus; label: string; icon: LucideIcon; chip: string; dot: string }> = [
  { value: "not_started", label: "Not started", icon: CircleDashed, chip: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" },
  { value: "in_progress", label: "In progress", icon: Timer, chip: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200", dot: "bg-amber-500" },
  { value: "waiting", label: "Waiting", icon: CirclePause, chip: "bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200", dot: "bg-sky-500" },
  { value: "blocked", label: "Blocked", icon: CircleSlash, chip: "bg-rose-100 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200", dot: "bg-rose-500" },
  { value: "complete", label: "Complete", icon: CircleCheck, chip: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200", dot: "bg-emerald-500" },
];

export function taskStatus(value: string | null | undefined) {
  return TASK_STATUSES.find((s) => s.value === value) ?? TASK_STATUSES[0];
}

export const TASK_PRIORITIES: Array<{ value: TaskPriority; label: string; chip: string }> = [
  { value: "low", label: "Low", chip: "bg-muted text-muted-foreground" },
  { value: "medium", label: "Medium", chip: "bg-slate-100 text-slate-800 dark:bg-slate-400/15 dark:text-slate-200" },
  { value: "high", label: "High", chip: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200" },
  { value: "urgent", label: "Urgent", chip: "bg-rose-100 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200" },
];

export function taskPriority(value: string | null | undefined) {
  return TASK_PRIORITIES.find((p) => p.value === value) ?? TASK_PRIORITIES[1];
}

export const LABEL_COLORS = ["slate", "gold", "sky", "green", "clay", "plum"] as const;

export function labelChip(color: string | null | undefined): string {
  return PLAN_COLORS.find((c) => c.value === color)?.chip ?? "bg-slate-100 text-slate-800 dark:bg-slate-400/15 dark:text-slate-200";
}

export const PLAN_VIEWS: Array<{ value: PlanView; label: string }> = [
  { value: "board", label: "Kanban" },
  { value: "grid", label: "Table" },
  { value: "list", label: "List" },
  { value: "calendar", label: "Calendar" },
];

export const DEFAULT_SCRATCH_GROUPS = [
  { name: "To Do" },
  { name: "In Progress" },
  { name: "Waiting" },
  { name: "Completed" },
] as const;
