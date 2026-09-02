"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  Cake,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  LayoutGrid,
  List,
  Table as TableIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SegmentedTab } from "@/components/ui/segmented-tabs";
import type { ParentStudentPayload } from "@/lib/students/parent-students";
import { cn } from "@/lib/utils";

export type StudentViewMode = "cards" | "list" | "table" | "calendar";

export const STUDENT_VIEW_TABS: readonly SegmentedTab<StudentViewMode>[] = [
  { id: "cards", label: "Cards", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "table", label: "Table", icon: TableIcon },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
] as const;

/** Everything a view needs from the manager, so views stay layout-only. */
type ViewProps = {
  students: ParentStudentPayload[];
  /** The shared controls block — campaign links, invite, remove. */
  renderDetail: (student: ParentStudentPayload) => ReactNode;
  /** The login state pill, so all views describe a student the same way. */
  renderStatus: (student: ParentStudentPayload) => ReactNode;
};

function campaignSummary(student: ParentStudentPayload) {
  if (student.campaigns.length === 0) return "Not on a campaign";
  if (student.campaigns.length === 1) return student.campaigns[0].title;
  return `${student.campaigns.length} campaigns`;
}

// ── Cards ────────────────────────────────────────────────────────────────────

export function StudentCardsView({ students, renderDetail, renderStatus }: ViewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {students.map((student) => (
        <Card key={student.id} className="border-border/80">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="font-heading text-base text-primary">{student.name}</CardTitle>
              <Badge variant="secondary">{student.grade || "Grade needed"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{student.school || "School needed"}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">{renderStatus(student)}</div>
            {renderDetail(student)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── List ─────────────────────────────────────────────────────────────────────

/**
 * One full-width row per student, opened on demand.
 *
 * The card grid gets tall fast once a family has several children, because
 * every card carries its campaign links and invite panel whether or not anyone
 * is looking at them. The list keeps each student to a single line until it is
 * expanded.
 */
export function StudentListView({ students, renderDetail, renderStatus }: ViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {students.map((student) => {
        const open = openId === student.id;
        return (
          <div key={student.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : student.id)}
              aria-expanded={open}
              className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-left transition-colors hover:bg-muted/40"
            >
              <ChevronDown
                className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                aria-hidden
              />
              <span className="font-heading text-base font-semibold text-primary">{student.name}</span>
              <Badge variant="secondary">{student.grade || "Grade needed"}</Badge>
              <span className="text-sm text-muted-foreground">{student.school || "School needed"}</span>
              <span className="ml-auto flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{campaignSummary(student)}</span>
                {renderStatus(student)}
              </span>
            </button>
            {open ? <div className="space-y-4 border-t border-border bg-muted/20 px-4 py-4">{renderDetail(student)}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────

export function StudentTableView({ students, renderDetail, renderStatus }: ViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            <th scope="col" className="px-4 py-2.5 font-medium text-muted-foreground">
              Student
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium text-muted-foreground">
              Grade
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium text-muted-foreground">
              School
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium text-muted-foreground">
              Campaigns
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium text-muted-foreground">
              Login
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium text-muted-foreground">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const open = openId === student.id;
            return [
              <tr key={student.id} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3 font-medium text-primary">{student.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{student.grade || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{student.school || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{campaignSummary(student)}</td>
                <td className="px-4 py-3">{renderStatus(student)}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : student.id)}
                  >
                    {open ? "Close" : "Manage"}
                  </Button>
                </td>
              </tr>,
              open ? (
                <tr key={`${student.id}-detail`} className="border-b border-border/70 last:border-0">
                  <td colSpan={6} className="bg-muted/20 px-4 py-4">
                    <div className="space-y-4">{renderDetail(student)}</div>
                  </td>
                </tr>
              ) : null,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Calendar ─────────────────────────────────────────────────────────────────

type StudentEvent = {
  key: string;
  date: Date;
  kind: "birthday" | "campaign-end";
  label: string;
};

/**
 * Dates that belong to the family's students.
 *
 * Birthdays are stored once but matter every year, so they are projected onto
 * the year being viewed. Campaign end dates come from the campaigns each child
 * is on — the deadline a family actually plans around.
 */
function studentEvents(students: ParentStudentPayload[], monthCursor: Date): StudentEvent[] {
  const year = monthCursor.getFullYear();
  const events: StudentEvent[] = [];

  for (const student of students) {
    if (student.birthDate) {
      const born = new Date(`${student.birthDate}T00:00:00`);
      if (!Number.isNaN(born.getTime())) {
        const turning = year - born.getFullYear();
        events.push({
          key: `${student.id}-birthday`,
          date: new Date(year, born.getMonth(), born.getDate()),
          kind: "birthday",
          label: turning > 0 ? `${student.firstName} turns ${turning}` : `${student.firstName}’s birthday`,
        });
      }
    }

    for (const campaign of student.campaigns) {
      if (!campaign.endsAt) continue;
      const ends = new Date(campaign.endsAt);
      if (Number.isNaN(ends.getTime())) continue;
      events.push({
        key: `${student.id}-${campaign.slug}-end`,
        date: new Date(ends.getFullYear(), ends.getMonth(), ends.getDate()),
        kind: "campaign-end",
        label: `${campaign.title} ends · ${student.firstName}`,
      });
    }
  }

  return events;
}

export function StudentCalendarView({ students }: { students: ParentStudentPayload[] }) {
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));

  const events = useMemo(() => studentEvents(students, monthCursor), [students, monthCursor]);
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(monthCursor)),
        end: endOfWeek(endOfMonth(monthCursor)),
      }),
    [monthCursor],
  );

  const monthEvents = events
    .filter((event) => isSameMonth(event.date, monthCursor))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const hasAnyDates = students.some(
    (student) => student.birthDate || student.campaigns.some((campaign) => campaign.endsAt),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold text-primary">{format(monthCursor, "MMMM yyyy")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMonthCursor((m) => addMonths(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMonthCursor(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMonthCursor((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {!hasAnyDates ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nothing to show yet. Add a date of birth to a student, or give a campaign an end date, and it will
          appear here.
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-7 gap-px rounded-t-xl border border-border bg-border">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label} className="bg-muted/50 px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px rounded-b-xl border border-t-0 border-border bg-border">
            {days.map((day) => {
              const dayEvents = events.filter((event) => isSameDay(event.date, day));
              const outside = !isSameMonth(day, monthCursor);
              return (
                <div
                  key={day.toISOString()}
                  className={cn("min-h-24 bg-card p-1.5", outside && "bg-muted/30 text-muted-foreground")}
                >
                  <span
                    className={cn(
                      "inline-grid size-6 place-items-center rounded-full text-xs",
                      isToday(day) ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <ul className="mt-1 space-y-1">
                    {dayEvents.map((event) => (
                      <li
                        key={event.key}
                        title={event.label}
                        className={cn(
                          "flex items-start gap-1 rounded px-1 py-0.5 text-[11px] leading-tight",
                          event.kind === "birthday"
                            ? "bg-primary/10 text-primary"
                            : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
                        )}
                      >
                        {event.kind === "birthday" ? (
                          <Cake className="mt-px size-3 shrink-0" aria-hidden />
                        ) : (
                          <Flag className="mt-px size-3 shrink-0" aria-hidden />
                        )}
                        <span className="line-clamp-2">{event.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {monthEvents.length > 0 ? (
        <ul className="space-y-1.5 text-sm">
          {monthEvents.map((event) => (
            <li key={`${event.key}-summary`} className="flex items-center gap-2">
              {event.kind === "birthday" ? (
                <Cake className="size-4 text-primary" aria-hidden />
              ) : (
                <Flag className="size-4 text-amber-600" aria-hidden />
              )}
              <span className="font-medium tabular-nums text-muted-foreground">{format(event.date, "MMM d")}</span>
              <span>{event.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
