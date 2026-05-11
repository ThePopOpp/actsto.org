-- Persist campaign saves/favorites per ACTSTO profile.
create table if not exists public.saved_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  campaign_slug text not null,
  created_at timestamptz not null default now(),
  constraint saved_campaigns_user_campaign_slug_key unique (user_id, campaign_slug)
);

create index if not exists saved_campaigns_campaign_slug_idx
  on public.saved_campaigns (campaign_slug);

