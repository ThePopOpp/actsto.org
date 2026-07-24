// Plan Builder types (camelCase; mirror the Prisma models).

export type PlanView = "board" | "grid" | "list" | "calendar";
export type PlanStatus = "active" | "archived";
export type PlanVisibility = "private" | "team";
export type TaskStatus = "not_started" | "in_progress" | "waiting" | "blocked" | "complete";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type PlanMemberRole = "owner" | "editor" | "member" | "viewer";

export type Plan = {
  id: string;
  ownerEmail: string;
  ownerName: string | null;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  defaultView: PlanView;
  status: PlanStatus;
  visibility: PlanVisibility;
  startDate: string | null;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type PlanGroup = { id: string; planId: string; name: string; color: string | null; position: number };
export type PlanLabel = { id: string; planId: string; name: string; color: string; position: number };
export type PlanMember = { id: string; planId: string; email: string; name: string | null; role: PlanMemberRole };
export type ChecklistItem = { id: string; taskId: string; title: string; isComplete: boolean; position: number };
export type PlanAssignee = { email: string; name: string | null };

export type PlanTask = {
  id: string;
  planId: string;
  groupId: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  isMilestone: boolean;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlanTaskDetail = PlanTask & {
  assignees: PlanAssignee[];
  labelIds: string[];
  checklist: ChecklistItem[];
};

export type PlanPerson = { email: string; name: string };

export type PlanAccess = { canView: boolean; canEdit: boolean; canManage: boolean };

export type PlanWorkspaceData = {
  plan: Plan;
  groups: PlanGroup[];
  labels: PlanLabel[];
  tasks: PlanTaskDetail[];
  members: PlanMember[];
  people: PlanPerson[];
  access: PlanAccess;
};

export type PlanSummary = Plan & {
  taskCount: number;
  completedCount: number;
  memberCount: number;
  canManage: boolean;
};

export type TaskInput = {
  title?: string;
  groupId?: string | null;
  description?: string | null;
  notes?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  startDate?: string | null;
  dueDate?: string | null;
  isMilestone?: boolean;
  assignees?: PlanAssignee[];
  labelIds?: string[];
  checklist?: { id?: string; title: string; isComplete: boolean }[];
};
