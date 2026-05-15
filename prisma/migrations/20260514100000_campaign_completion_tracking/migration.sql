ALTER TABLE campaigns
  ADD COLUMN completion_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN missing_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN last_completion_reminder_at timestamptz;

CREATE INDEX campaigns_created_by_status_idx ON campaigns(created_by_user_id, status);
CREATE INDEX campaigns_completion_percent_idx ON campaigns(completion_percent);
