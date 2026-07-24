-- Plan Builder: plans + groups + labels + members + tasks + assignees + task-labels + checklist.

CREATE TABLE IF NOT EXISTS "plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_email" TEXT NOT NULL,
  "owner_name" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT 'gold',
  "icon" TEXT NOT NULL DEFAULT 'clipboard-list',
  "default_view" TEXT NOT NULL DEFAULT 'board',
  "status" TEXT NOT NULL DEFAULT 'active',
  "visibility" TEXT NOT NULL DEFAULT 'private',
  "start_date" DATE,
  "target_date" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMP(3),
  CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "plans_owner_email_idx" ON "plans" ("owner_email");

CREATE TABLE IF NOT EXISTS "plan_groups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plan_groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plan_groups_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "plan_groups_plan_id_position_idx" ON "plan_groups" ("plan_id", "position");

CREATE TABLE IF NOT EXISTS "plan_labels" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT 'slate',
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "plan_labels_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plan_labels_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "plan_labels_plan_id_idx" ON "plan_labels" ("plan_id");

CREATE TABLE IF NOT EXISTS "plan_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'member',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plan_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plan_members_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "plan_members_plan_id_email_key" ON "plan_members" ("plan_id", "email");

CREATE TABLE IF NOT EXISTS "plan_tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL,
  "group_id" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'not_started',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "start_date" DATE,
  "due_date" DATE,
  "is_milestone" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plan_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plan_tasks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "plan_tasks_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "plan_groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "plan_tasks_plan_id_group_id_position_idx" ON "plan_tasks" ("plan_id", "group_id", "position");

CREATE TABLE IF NOT EXISTS "plan_task_assignees" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "task_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  CONSTRAINT "plan_task_assignees_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plan_task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "plan_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "plan_task_assignees_task_id_email_key" ON "plan_task_assignees" ("task_id", "email");

CREATE TABLE IF NOT EXISTS "plan_task_labels" (
  "task_id" UUID NOT NULL,
  "label_id" UUID NOT NULL,
  CONSTRAINT "plan_task_labels_pkey" PRIMARY KEY ("task_id", "label_id"),
  CONSTRAINT "plan_task_labels_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "plan_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "plan_task_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "plan_labels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "plan_task_checklist_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "task_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "is_complete" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "plan_task_checklist_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plan_task_checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "plan_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "plan_task_checklist_items_task_id_position_idx" ON "plan_task_checklist_items" ("task_id", "position");
