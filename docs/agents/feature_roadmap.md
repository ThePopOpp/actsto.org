# ACTSTO.ORG — Feature Port Roadmap (from the MJG WebApp)

> **You (the agent reading this) are working on ACTSTO.ORG.** This document is a
> hand-off. It describes a set of features that already exist and work in another
> app — the **MJG WebApp** (repo already shared with you) — and tells you how to
> port them into ACTSTO. Both apps share the same tech stack, so most of this is
> lift-and-adapt, not rebuild-from-scratch.
>
> Treat the MJG repo as the reference implementation. When this doc says "copy
> `lib/x`", it means read MJG's version, understand it, then bring it across and
> adapt the domain specifics called out under **Adapt for ACTSTO**.

---

## 0. What ACTSTO is (so you adapt, not just copy)

**ACTSTO.ORG** is a web app that helps **families, students, and donors fund private
school education in Arizona** — think crowdfunding for tuition, working alongside
Arizona's School Tuition Organization (STO) tax-credit system.

That domain changes the *nouns*, not the *machinery*. Where MJG has:

| MJG concept | ACTSTO equivalent (suggested) |
|---|---|
| **Participants** (people in "The Journey") | **Families / Students / Donors** |
| A personal ministry brand (Michael J. Gauthier) | An **organization** brand (ACTSTO) |
| "The Stewardship Blueprint" book funnel | **Tuition campaigns / funding goals** |
| Journey signup → nurture emails | Donor/family onboarding → nurture + receipts |

Every feature below is domain-neutral plumbing. Your job when porting is to keep the
plumbing and re-skin the nouns, copy, branding, and the AI agent's persona/tools.

**Golden rules carried over from MJG (learned the hard way):**
- Never hardcode a domain — use an env-driven site URL. MJG just migrated domains and
  paid for hardcoded links.
- All outbound email must send from **one verified domain**; a misconfigured sender
  fails loudly (see §Email).
- Destructive actions are never GET routes reachable by a `<Link>` (a prefetch once
  auto-signed-users-out in MJG).
- Migrations are numbered, tracked, and applied via a script (see §Migrations).

---

## 1. Shared tech stack (identical to MJG)

- **Next.js 15** (App Router, route handlers) + **React 19** + **TypeScript**
- **Supabase**: Postgres + Auth + Storage. Three client flavors in `lib/supabase/`:
  - `browser.ts` — anon client for client components
  - `server.ts` — cookie-bound server client (respects RLS as the signed-in user)
  - `admin.ts` — **service-role** client (bypasses RLS; server-only, never import in a
    client component)
- **Tailwind CSS** + **Radix UI primitives** (`@radix-ui/react-*`) + **lucide-react** icons
- Feature-specific libs (install only what you port):
  - `twilio` + `@twilio/voice-sdk` — SMS + browser dialer
  - `nodemailer` + `imapflow` + `mailparser` — SMTP send + IMAP receive
  - `web-push` — VAPID web push notifications
  - `qrcode` — business-card QR / vCard
  - `mammoth` + `unpdf` — parse .docx/.pdf for AI training documents
  - `html-to-image` — render cards/graphics client-side
  - OpenAI (via `fetch`, no SDK dependency) — the AI agent

---

## 2. Shared foundation you MUST port first

These are not features; they are the substrate every feature below assumes. Port
these before anything else or nothing will compile.

### 2.1 Identity & roles (`lib/rbac/`)
- **`profiles`** table: 1:1 with `auth.users` (`id uuid PK references auth.users`),
  carries `email`, `first_name`, `last_name`, `role` (enum `app_role`), `status`
  (enum `user_status`), timestamps. This is the anchor for everything.
- **`roles.ts`** — the `ROLES` map: `super_admin`, `admin`, `team_member`,
  `content_reviewer`, `pastor_elder_reviewer`, `participant`.
  → **Adapt for ACTSTO:** rename the domain roles. Likely `super_admin`, `admin`,
  `staff`, `family`, `donor` (drop `pastor_elder_reviewer`; it's ministry-specific).
- **`permissions.ts`** — `PERMISSIONS` map + `ROLE_PERMISSIONS` matrix + `can(role,
  permission)`. Super-admin is a hard shortcut (always true). Nav items and API routes
  gate on these.

### 2.2 Server auth helpers (`lib/user-management/auth.ts`)
A family of guards each route calls at the top: `requireSuperAdmin`,
`requireAdminManager`, `requireContentManager`, `requireParticipantManager`,
`requireUserManager`, `requireActiveProfile`. Each resolves the signed-in user
(session cookie *or* action token), loads their profile, checks role/status, and
throws on failure. **Every mutating API route starts with one of these.**

### 2.3 The action-token pattern (`lib/auth/action-token.ts`) — important
Dashboard pages render with a short-lived **HMAC-signed admin action token** (12h TTL,
signed with the service-role key). Client components send it back on mutations via the
`x-mjg-action-token` header (rename to `x-actsto-action-token`). The server verifies
it as a fallback to the session cookie. This is why dashboard "Save" buttons work even
if the cookie is momentarily unavailable. Port `lib/auth/action-token.ts`,
`components/layout/dashboard-action-token.tsx`, and the `useDashboardActionToken` hook
together.

### 2.4 Dashboard shell + nav registry (`components/layout/`)
- `dashboard-nav.ts` — a single `dashboardNav` array of items/groups, each optionally
  gated by a `permission`. **This is where every feature appears in the sidebar.**
  Adding a feature = adding one entry here.
- `dashboard-shell.tsx` — renders the sidebar (filtering by `can()`), the top bar, and
  provides the action token.
  → **Adapt for ACTSTO:** the Communications group, Plans, AI Agent, Media Studio
  entries below map 1:1. Re-skin labels/icons; drop MJG-only items (Waves, Pastor/Elder
  Review, Inner Circle).

### 2.5 Migrations (`supabase/migrations/` + `scripts/apply-migrations.mjs`)
- Numbered SQL files (`YYYYMMDDNNNN_name.sql`), applied in filename order, each in its
  own transaction. A `_mjg_migrations` table (rename to `_actsto_migrations`) records
  what's applied so each runs once.
- Runner reads `DATABASE_URL` from `.env.local`. Commands:
  `npm run db:migrate` (apply), `db:migrate:status`, `db:migrate:check`,
  `--baseline` (mark applied without running).
- **When you port a feature, port its migration(s) too** — renumber them into ACTSTO's
  own sequence, don't keep MJG's numbers.

### 2.6 Notifications + PWA push (shared by many features)
Multiple features (DMs, forms, media sharing) write to a central **`notifications`**
table and can fan out via **web push**. Details in the Notifications section — but know
that it's a shared dependency, so port it early.

---

## 3. Feature ports

> Each feature below follows the same shape: **What it is · Key files · DB & migrations
> · API surface · External deps/env · Adapt for ACTSTO · Depends on**. Port order is
> suggested at the end (§4).

### 3.1 Notifications + Web Push  *(port early — shared dependency)*

**What it is.** Two loosely-coupled systems: (a) a central **`notifications`** table for
in-dashboard alerts, and (b) **VAPID web push** to a user's subscribed PWA devices.
Many features write to these (DMs, form submissions, media sharing).

**Key files.** `lib/notifications/notify.ts` (`createDashboardNotification()`),
`lib/push/web-push.ts` (`hasPushConfig()`, `sendPushToUser(userId, payload)` — fans out
to all of a user's subscriptions, prunes dead 404/410 endpoints),
`lib/pwa/install-guide.ts` (platform-detect + install instructions),
`public/sw.js` (service worker: `push`→`showNotification`, `notificationclick`→focus/open),
`components/pwa/pwa-register.tsx`.

**DB & migrations.** `notifications` (created in the pilot migration `…0002`; columns:
`type`, `title`, `message`, `destination`, `status`, `metadata` jsonb, `read_at`).
`push_subscriptions` (migration `…0038`: `user_id`→profiles, unique `endpoint`, `p256dh`,
`auth`, `user_agent`; RLS on, service-role-only).

**API surface.** `POST /api/push/subscribe` (upsert a subscription, auth
`requireActiveProfile`), `DELETE /api/push/subscribe?endpoint=`. Note: **no route emits
push from the notifications table** — push is triggered inline from server libs (DMs etc.).

**External deps / env.** `web-push` lib. `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Push is a silent no-op unless both keys are set —
so the app degrades gracefully if you defer push.

**Adapt for ACTSTO.** `VAPID_SUBJECT` default `mailto:admin@michaeljgauthier.com`; push
default title "Michael J. Gauthier"; SW cache name `mjg-shell-v1`; icons at
`/icons/icon-192.png`; the `notifications.type` union is ministry-labeled
(survey/check-in/inner-circle). Rename all of these. Push targets **staff `profiles`**,
not the public audience — keep that model (donors/families don't get push).

---

### 3.2 Email suite  *(Inbox · Templates · Journey/Automation · Send)*

**What it is.** Four sub-features over one send abstraction: IMAP **inbox** (receive),
**templates** with `{{merge}}` fields, a **journey/automation** drip engine, and manual
**compose/send**. The dashboard lives under `app/dashboard/emails/*` (the older
`email-inbox`/`email-templates`/`email-journey` routes are just redirect stubs).

**Key files.** `lib/email/smtp.ts` (the send abstraction — read this first),
`lib/email/inbox.ts` (IMAP sync), `lib/email/templates.ts` (render + `sendTemplateEmail`
+ `sendDueJourneyEmails`), `lib/email/journey.ts` (the drip schedule), `lib/email/constants.ts`
(merge-field catalog + event keys).

**How sending works (critical).** `sendSmtpEmail()` picks a provider:
1. If `RESEND_API_KEY` is set → **Resend** (HTTP POST, preferred whenever the key exists).
2. Else if full SMTP creds → **nodemailer**.
3. Else → soft no-op `{ok:false, skipped:true}` (not an error).
The Resend path reads `RESEND_FROM_EMAIL`, **trims it, and throws if empty** — it
deliberately refuses to fall back to another identity/unverified domain. (This guard was
added after a silent fallback sent mail under the wrong domain in MJG. Keep it.)

**DB & migrations.** `email_messages` (inbox, `…0004`; moderation soft-delete cols in
`…0007`), `email_templates` + `email_send_logs` (`…0005`), `email_journey_events`
(pilot `…0002`; `template_id`/indexes added in `…0006`), `email_template_mappings`
(`…0006`, seeds event→template rows). Consent columns (`email_opt_in`,
`email_journey_opt_in`, …) live on both `participants` and `profiles`.

**API surface.** Admin (auth `requireUserManager`): `POST /api/admin/email/sync` (IMAP),
`PATCH /api/admin/email/messages/[id]` (hide/remove/delete), `POST …/manual` (compose w/
attachments), `POST …/test`, `POST …/templates` (+`/test-send`, `/deploy`, `/recipient-count`),
`POST …/journey/send-due` (the automation runner — **wire to a cron/scheduler**),
`POST …/template-mappings`. Public (unauthenticated): `POST /api/public/email/opt-in`
and `/opt-out` (toggle consent + write `consent_events` with IP/UA).

**External deps / env.** `nodemailer`, `imapflow`, `mailparser`. **Resend:**
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`. **SMTP:** `SMTP_HOST`,
`SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `NOTIFICATION_FROM_EMAIL`.
**IMAP:** `IMAP_HOST/PORT/SECURE/USER/PASSWORD`. (AWS SES vars exist in MJG's env but
**no SES code exists** — ignore them.)

**Adapt for ACTSTO.** The **entire journey is MJG-branded**: `lib/email/journey.ts` is a
fixed 13-step "Created for More 7-Day Stewardship Pilot" with hardcoded subject lines and
"The Stewardship Blueprint" product references — **replace the whole sequence** with
ACTSTO's onboarding (e.g. donor welcome → tax-receipt → impact updates). Merge-field URL
paths (`/check-in`, `/surveys/general`, …) and the event taxonomy in `constants.ts` are
pilot-specific. From-addresses (`hello@`, `mike@`, `jw@michaeljgauthier.com`) and the
Hostinger mail host all change. Build a **real unsubscribe/preferences page** — MJG points
those merge tokens at `/contact`.

**Depends on.** profiles/participants + consent columns, `notifications` (sync logs).

> ⚠️ **Security:** MJG's `.env.local` contains live plaintext secrets (a real Resend key,
> SMTP/IMAP passwords). Do **not** copy real secrets into ACTSTO's repo — provision fresh
> ones in your own secret store.

---

### 3.3 SMS (Twilio A2P 10DLC + consent)

**What it is.** Two-way SMS inbox, templated 1:1 sends and bulk broadcasts, with the full
A2P 10DLC consent lifecycle: web-form opt-in/out, keyword STOP/START/HELP, admin manual,
and an auditable `consent_events` trail.

**Key files.** `lib/twilio/sms.ts` (`sendSms`, conversation upsert, merge data),
`lib/sms/constants.ts` (keyword lists + canned replies + **A2P-registered disclosure copy**),
`lib/sms/templates.ts` (`{{field}}` render, GSM/Unicode segment counter),
`app/dashboard/sms/{page,compose,templates,broadcasts}`.

**DB & migrations.** All in `…0011` (`sms_voice_communications`): `consent_events`
(audit, with a public web_form insert policy), `sms_conversations`, `sms_messages`,
`sms_templates`, `sms_send_logs`. Consent columns added to **both** `participants` and
`profiles`. RPC `increment_sms_unread`.

**API surface.** Webhooks: `POST /api/webhooks/twilio/sms` (inbound; STOP/START/HELP
handling + consent writes, else store + bump unread), `…/sms-status` (delivery).
Public: `POST /api/public/sms/opt-in`, `…/opt-out`. Admin: `POST /api/admin/sms/send`
(1:1, opt-in guarded), `…/broadcast` (bulk, filters `sms_opt_in=true`), `…/templates`,
`…/conversations`, `…/import-csv`, `POST /api/admin/communications/opt` (bulk SMS+email).

**External deps / env.** Twilio Messaging: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_PHONE_NUMBER`, `NEXT_PUBLIC_SITE_URL` (builds opt-out URL merge token).

**Adapt for ACTSTO.** The brand strings **"Created for More" / "Michael J. Gauthier"** are
baked into `SMS_STOP_REPLY`/`START`/`HELP`/`OPT_IN_DISCLOSURE` — these are the
**A2P-registered campaign copy and must be re-registered with Twilio** for ACTSTO before
sending. Merge fields (`wave`, `check_in_status`, …) are pilot-specific. **Opt-in defaults
to `true`** (existing-relationship model) — for a public crowdfunding audience you almost
certainly want default **`false`** (express opt-in). ⚠️ Inbound webhooks do **not** call
`validateTwilioRequest` (it exists but is unused) — **add signature validation** before
going live.

**Depends on.** profiles/participants + consent columns, Twilio account.

---

### 3.4 Voice Dialer (Twilio Voice SDK softphone)

**What it is.** A browser softphone (WebRTC) for placing/receiving calls from the
dashboard, with server-side call logging, recordings, voicemail, on-demand Whisper
transcription, and per-call cost tracking.

**Key files.** `app/dashboard/dialer/` → `components/dialer/dialer-dashboard.tsx` +
`softphone.tsx` (dynamically imports `@twilio/voice-sdk` `Device`),
`lib/twilio/client.ts` (singleton client, `fetchCallPrice`, `validateTwilioRequest`),
`lib/twilio/voice.ts` (`generateVoiceAccessToken`, TwiML builders),
`lib/openai/transcribe.ts` (Whisper).

**DB & migrations.** `calls` + `call_transfers` in `…0011`; `…0015` adds `price`,
`price_unit`, `transcription_status` to `calls`. RLS: read = dashboard access; write =
super_admin/admin/team_member.

**API surface.** `POST /api/admin/voice/token` (mint access token),
`GET /api/admin/voice/calls`, `PATCH …/calls/[id]`, `PATCH …/calls/by-sid`,
`POST …/calls/[id]/transcribe`. Webhooks: `POST /api/webhooks/twilio/voice` (TwiML entry;
inserts call row, matches caller to participant/profile), `…/voice-status`, `…/recording`
(voicemail if unanswered), `…/transcription`.

**External deps / env.** `@twilio/voice-sdk` + `twilio` + OpenAI Whisper. Env: the six
`TWILIO_*` vars (`ACCOUNT_SID`, `AUTH_TOKEN`, `PHONE_NUMBER`, `API_KEY`, `API_SECRET`,
`TWIML_APP_SID`), `NEXT_PUBLIC_APP_URL` (webhook callback base), `OPENAI_API_KEY`.

**Adapt for ACTSTO.** Hardcoded fallback caller ID `+14804393335` in `lib/twilio/client.ts`;
TwiML client identity is the literal `mjg-agent` (a single shared agent, not per-user);
voicemail greeting uses `Polly.Joanna` with fixed English copy. Requires a Twilio number +
a TwiML App configured to hit your webhooks.

**Depends on.** profiles/participants (caller matching), Twilio Voice + TwiML app,
`NEXT_PUBLIC_APP_URL` reachable by Twilio.

---

### 3.5 Direct Messages (DMs)

**What it is.** Internal 1:1 private messaging between dashboard **staff** (`profiles`),
with per-user unread state, attachments + voice notes, importance flags, and best-effort
email/SMS/push alerts. Admins start conversations; invited users reply.

**Key files.** `components/direct-messages/dm-inbox.tsx` (full client UI; 15s polling),
`dm-unread.tsx` (`DmUnreadProvider` + `useDmUnread()` — single source of truth for the
header bell + nav badge, 20s poll + on window focus), `lib/direct-messages/data.ts`,
`notify.ts` (push always; email/SMS debounced 5 min), `preferences.ts`. The shell wraps
the app in `DmUnreadProvider`.

**DB & migrations.** `…0036`: `dm_conversations`, `dm_participants`, `dm_messages`
(importance enum, `attachments` jsonb, soft-delete). `…0037` adds `last_notified_at`
(debounce). RPCs `dm_unread_count`, `dm_conversation_unread`, `dm_is_participant`
(all `security definer`; RLS on all tables as a safety net — APIs authorize in code).

**API surface.** Under `app/api/direct-messages/` (auth `requireActiveProfile`):
`GET/POST conversations` (POST admin-only), `GET/POST conversations/[id]`,
`GET unread` (returns `{unread:0}` on any error to protect the header chrome),
`POST upload` (attachments to Supabase Storage, 50MB), `GET/POST preferences`,
`GET users` (people-picker, admin-only).

**External deps / env.** Reuses email (`lib/email/smtp`), SMS (`lib/twilio`), push
(`lib/push`) — so no new env beyond those. Attachments use a Supabase Storage bucket.

**Adapt for ACTSTO.** Hardcoded `MESSAGES_URL = https://my.michaeljgauthier.com/dashboard/direct-messages`
in `notify.ts`; brand email chrome from `lib/brand/assets`; storage bucket `mjg-media`;
action-token header `x-mjg-action-token`. Schema is group-ready but product is 1:1;
`muted`/`edited_at`/`deleted_at` columns exist but have no UI yet. No realtime — it polls.

**Depends on.** profiles, Notifications/push, Email, SMS, Supabase Storage.

---

### 3.6 Social Media hub

**What it is.** A Facebook + LinkedIn content hub: block-editor post templates, scheduling,
a unified inbox (messages/comments/reviews/mentions), analytics rollups, automations, and
credential settings. **Live posting is stubbed behind one adapter seam** — everything else
is real.

**Key files.** `lib/social-media/data.ts` (data layer + publish orchestration),
`publish.ts` (**the stubbed adapter** — `publishToPlatform` returns a `simulated()` fake id
for FB + LinkedIn; real calls marked `TODO(live)`), `render.ts` (block schema → payload,
merge fields), `constants.ts` (`PLATFORMS` + per-platform credential specs),
`app/dashboard/social-media/*`, `components/social-media/*`.

**DB & migrations.** All in `…0021`: `social_accounts` (holds `credentials` jsonb,
admin-only RLS), `social_templates` (`builder_schema` jsonb block editor), `social_posts`
(status lifecycle draft→scheduled→published/failed), `social_messages` (inbox),
`social_automations` (event→template), `social_analytics_daily`. Seeds two disconnected
MJG accounts + two starter templates. Platform CHECK already allows
fb/ig/linkedin/x/youtube/tiktok/threads/pinterest — **adding a network needs no migration**,
just a `constants.ts` entry.

**API surface.** Under `app/api/admin/social-media/` (auth `requireUserManager`):
`accounts`, `templates`, `posts`, `publish` (`{id}` now, or `{dueOnly, limit}` runs the
scheduler `publishDuePosts`), `messages`, `automations`, `analytics`.

**External deps / env.** **None wired** — platform credentials are user-entered in Settings
and stored in `social_accounts.credentials` jsonb. Expected keys: FB → `page_id`,
`page_access_token`, `app_id`, `app_secret`; LinkedIn → `organization_urn`, `access_token`,
`client_id`, `client_secret`.

**What's stubbed vs real.** STUBBED: actual posting (`publish.ts` — swapping to live is a
localized change in that one file); the scheduler exists but **no cron is configured**;
inbox ingestion + analytics collection have no fetch/webhook (rows populated externally).
REAL: block editor, merge fields, post CRUD + status lifecycle, dashboard stats, reports,
inbox status/reply updates, automations, RLS.

**Adapt for ACTSTO.** Replace the seeded account names + stewardship starter templates and
hashtags (`#Stewardship`, `#StewardshipBlueprint`); merge fields and automation event keys
(`blog_post_published`, `event_published`, `booking_type_published`, `weekly_encouragement`)
map to MJG's blog/events/booking modules — repoint to ACTSTO events. When you wire live
posting, implement the two `TODO(live)` branches in `publish.ts`.

**Depends on.** profiles/RBAC, a scheduler if you want auto-publish.

---

### 3.7 Digital Business Cards

**What it is.** Shareable digital business cards owned by individual staff (`profiles`).
Each card has a public page at `/c/{slug}` with QR/NFC entry points, vCard download, lead
capture, per-card email/SMS automations, and view/click analytics.

**Key files.** `app/dashboard/business-cards/*` (builder, analytics, leads inbox),
`app/c/[slug]/page.tsx` + `public-card.tsx` (the public page; records the view event),
`lib/business-cards/` — `data.ts` (all DB + stats), `defaults.ts` (builder defaults +
color presets), `notify.ts` (lead-submit automations via Resend + Twilio).

**DB & migrations.** All in `…0017`: `business_cards` (owner→profiles, `card_mode`,
several jsonb config blobs, denormalized counters), `business_card_links`,
`business_card_sections`, `business_card_events` (analytics log), `business_card_leads`.
No RPCs — counters are read-then-write in TS. RLS present; public reads + writes go through
the service-role client.

**API surface.** Dashboard (auth `requireParticipantManager`): `GET/POST /api/business-cards`
(list + create/update; admins get `?scope=all`), `GET …/detail`, `PATCH/DELETE …/[id]`,
`GET …/[id]/analytics`, `GET …/leads`, `PATCH/DELETE …/leads/[id]`,
`POST …/leads/[id]/convert` (**MJG-specific** — converts a lead into a `contacts` row or
pilot participant). Public (no auth): `POST /api/cards/events`, `POST /api/cards/leads`,
`GET /api/cards/qr` (QR PNG via `qrcode`), `GET /api/cards/vcf` (vCard 3.0 download).

**External deps / env.** `qrcode`. Reuses Resend + Twilio for lead automations. Public base
URL fallback `https://my.michaeljgauthier.com` (override `NEXT_PUBLIC_APP_URL`).

**Adapt for ACTSTO.** Company default `'Michael J. Gauthier'` (migration + `defaults.ts`);
brand colors in DB defaults + `COLOR_PRESETS` (teal `#1A2E3B`, gold `#C9A96E`); public base
URL. The **lead→participant conversion** is tied to MJG's pilot module — repoint to ACTSTO's
family/donor model or remove. Public card route is `/c/{slug}`.

**Depends on.** profiles, Email, SMS, `qrcode`.

---

### 3.8 Plans (Plan Builder) + the Feature-Flag system

**What it is.** A standalone planner module (boards/grids, tasks, groups, labels,
checklists, members, activity audit) — built **entirely separate** from the existing
Project Manager, which it doesn't touch. It's the app's **first feature-flag-gated
feature** (Premium gated by `plan_builder.premium`).

**Key files.** `app/dashboard/plans/` (index resolves the premium flag server-side, plus
`[planId]`), `components/plans/plans-index-client.tsx`, `lib/plans/` — `auth.ts`
(authorization mirror of the SQL functions), `data.ts` (reads), `repository.ts` (writes +
the `create_plan_from_template` RPC + activity logging), `constants.ts` (colors/statuses/
default groups).

**DB & migrations.** `…0040` creates 10 tables (`plans`, `plan_members`, `plan_groups`,
`plan_labels`, `plan_tasks`, `plan_task_assignees`, `plan_task_labels`,
`plan_task_checklist_items`, `plan_activity`, `plan_templates`) + **RPCs**:
`create_plan_from_template(...)` (SECURITY DEFINER, atomic multi-table create — the JS
client can't do transactions; EXECUTE granted only to `service_role`, `p_actor_id` is
trusted server input) and RLS helpers `can_view_plan`/`can_edit_plan`/`can_manage_plan`
keyed on `current_profile_id()`. `…0041` seeds 6 **generic** templates (reusable);
`…0044` seeds 10 **MJG-specific** templates (replace these).

**API surface.** Auth `requirePlanUser`; per-action `requirePlanView/Edit/Manage`.
`GET/POST /api/plans` (POST **enforces the premium flag → 403**), `PATCH/DELETE /api/plans/[planId]`,
`POST …/tasks` + `PATCH/DELETE …/tasks/[taskId]` + `…/tasks/[taskId]/move`,
`POST …/groups` + `PATCH/DELETE …/groups/[groupId]`.

**Adapt for ACTSTO.** Single-tenant assumption — **no `workspace_id`**; `client_id`/
`project_id` are nullable un-FK'd uuids (portable by design). Palette in `constants.ts`
deliberately has **no green** (completion shown by icon + strikethrough). Replace the 10
MJG templates in `…0044` wholesale; keep the 6 generic ones.

#### The Feature-Flag system (reusable primitive — port with Plans, useful everywhere)

`…0039` creates `feature_flags`:
```
key                 text primary key      -- namespaced, e.g. 'plan_builder.premium'
enabled             boolean default false -- global on-switch
enabled_roles       app_role[] default '{}'  -- role allowlist
enabled_profile_ids uuid[]    default '{}'    -- per-profile allowlist
```
This is **not** billing/entitlements — it's a generic gate for optional capabilities. RLS:
any dashboard user may `SELECT` (the UI needs to know what to render); only super admins
may write.

`lib/flags/index.ts` mirrors it: a typed `FLAGS` map + `isFeatureEnabled(key, {id, role})`
+ batched `getEnabledFlags`. **Grant = OR of three (default DENY):** `enabled===true`, OR
role ∈ `enabled_roles`, OR id ∈ `enabled_profile_ids`. Super admin short-circuits to true.
**Fail-closed:** unknown key or query error returns `false`.

**Pattern to replicate for any gated feature:**
1. Add a namespaced row to `feature_flags` (migration or super-admin write).
2. Add the key to the `FLAGS` map.
3. **Server render:** call `isFeatureEnabled()` in the page, pass the boolean to the client
   to show/hide UI.
4. **API enforcement (authoritative):** re-check in the route before the privileged action
   and throw 403. (Plans also forces `effectiveType='premium'` when a premium *template* is
   chosen, so you can't route around the flag.)

**Depends on.** profiles/RBAC (`app_role`, `normalizeAppRole`, `current_profile_id()`).

---

### 3.9 Media Studio (Audio · Video · Photos · Resources)

**What it is.** A Super-Admin/Admin tool to upload, record, and catalog four asset types
and **place them onto public + dashboard surfaces** via a per-asset "display targets"
mechanism stored in JSONB. It's the single content source feeding the public homepage,
Resources page, and Listen (audiobook) page.

**Key files.** `app/dashboard/media-studio/page.tsx` → `components/media-studio/media-studio-dashboard.tsx`
(one big client component containing `AudioStudio`, `VideoPhotoStudio`, `ResourceStudio`,
`MediaLibrary`, `AudioPlayerSheet`, and the `uploadFile` helper),
`components/media-studio/listen-order-panel.tsx` (drag/keyboard reorder),
`lib/content/media.ts` (all queries + `saveMediaAsset`, `saveAudioSortOrder`, the
target-fetch functions), `app/api/admin/media-assets/{route,order,upload}.ts`.

**DB & migrations.** `…0008` (`content_media_cms`) creates `media_assets` (the primary
table — `asset_type`, `source_type`, `file_url`/`storage_*`/`embed_url`, `status`,
`visibility`, and a `metadata` jsonb holding `display_targets`, `sort_order`,
`thumbnail_url`, `publish_at`, `card_style`), plus `media_collections` +
`media_publish_targets` (a relational alternative that the current UI **bypasses**).
`…0034` adds `'document'` to the asset_type CHECK (enables Resources). `…0018` provisions a
public storage bucket. `…0045` is a one-off de-WordPress data migration.

**The display-targets mechanism (this is the heart of it).** Placement is driven entirely
by a **JSONB string array `metadata.display_targets`** — no schema column, no migration to
add a surface.
- The `displayTargets` constant in `media-studio-dashboard.tsx` is the source-of-truth list
  of surface keys + labels: `frontend_home`, `frontend_resources`, `frontend_listen`,
  `user_dashboard_notifications`, `user_dashboard_audio`, `selected_users`. Each renders as
  a toggle; selected keys are written to `metadata.display_targets` on save.
- Read side (`lib/content/media.ts`): `getPublishedAudioForTarget(target, limit=6)` —
  newest-first, used by the homepage + Resources page. `getOrderedAudioForTarget(target)` —
  ordered by `metadata.sort_order` (a **sibling**, not a replacement — the audiobook Listen
  page needs deliberate chapter order; unordered tracks sort last, never vanish).
  `getAudioForTargetIncludingDrafts(target)` — for the ordering panel.
- ⚠️ `saveMediaAsset` **replaces `metadata` wholesale**, so the audio save spreads existing
  metadata first to avoid wiping `sort_order`. Preserve that when you touch it.

**Asset lifecycle.** `status` (`draft`/`published`/`hidden`/`archived`/`deleted`) — only
`published` appears publicly; `deleted` excluded everywhere. `visibility`
(`private`/`public`/`assigned`) is stored + badged but **not yet an active filter** in the
public reads (they gate on `status='published'` + target membership).

**Upload/storage.** `POST /api/admin/media-assets/upload` (auth `requireContentManager`)
into a Supabase Storage bucket (`ensureBucket()` lazily creates it, 100MB, MIME-gated by
intent: audio/thumbnail/video/document). Path `{folder}/{YYYY-MM-DD}/{uuid}{ext}`.
**In-browser audio recording** via `MediaRecorder` → blob → same upload route
(`source_type='recording'`). Any form also accepts a direct `file_url`/`embed_url` with no
upload. ⚠️ Two bucket names exist in MJG (`media-assets` at runtime vs `mjg-media` in a
migration) — **reconcile to one** in ACTSTO.

**API surface.** `POST /api/admin/media-assets` (save; auth `requireAdminManager`; strips
`metadata.shared_with` from non-super-admins), `POST …/order` (writes dense
`metadata.sort_order` for every id), `POST …/upload`.

**External deps / env.** `@supabase/supabase-js` (storage). `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, plus `publicSiteUrl()` for the public read routes.

**Adapt for ACTSTO.** The surface keys are **hardcoded strings that must stay in sync**
across the component and every consumer (`app/route.ts`, `app/resources/route.ts`,
`app/listen/route.ts`) — pick your own (e.g. `frontend_home`, `campaign_gallery`, …). The
Listen=audiobook framing and `card_style:"stewardship_audio_card"` are MJG product; bucket
names and `public/media`/`public/mjg-logos` assets are org-named. Decide up front whether
to consolidate on the JSONB `display_targets` approach (recommended — it's what actually
runs) or the unused relational `media_publish_targets` table.

**Depends on.** profiles/RBAC, Supabase Storage, the action-token pattern, `notifications`
(resource-shared alert).

### 3.10 AI Agent ("Steward") + Training Documents

**What it is.** An OpenAI-backed operations agent embedded in the admin dashboard. It
answers questions grounded in **live dashboard data** via ~60 read tools and performs
mutating actions (send SMS/email, publish content, edit records, author CMS drafts) **only
after explicit per-action user confirmation**. Admin-gated; some tools are Super-Admin-only.
**Training Documents** is its knowledge base — reference material converted to markdown and
retrieved on demand.

**Architecture (the chat loop).** `lib/ai-agent/agent.ts` → `runAgent(messages, ctx,
decisions)`:
- Model call is a plain `fetch` to OpenAI **Chat Completions** (`/v1/chat/completions`),
  not the SDK, with `tools` + `tool_choice:"auto"`.
- **Read vs confirmation-gated** is the core distinction: every tool has a
  `requiresConfirmation` boolean. Read tools auto-run and loop so the model sees results.
  Action tools **never execute without an explicit `approve` decision** — they short-circuit
  into `pendingActions` (a confirm card built by the tool's `summarize(args)`) and the loop
  pauses (`done:false`) until the user approves. Actions log to `user_activity_logs`.
- Reasoning loop capped at `MAX_ITERATIONS = 8`. The system prompt is **rebuilt fresh every
  turn** from the persona + skill playbooks + recalled memory + training-docs index; any
  client-echoed system message is stripped and replaced.

**Key files.** `lib/ai-agent/agent.ts` (loop, `SYSTEM_PROMPT`, `buildSystemPrompt`),
`lib/ai-agent/tools.ts` (**all ~60 tool defs** — `AGENT_TOOLS[]` registry, `TOOL_MAP`;
**to add a tool**: define an `AgentTool` with `name`/`description`/`parameters`
(JSON-schema)/`requiresConfirmation`/optional `summarize`/`execute(args, ctx)`, then append
to `AGENT_TOOLS`), `lib/ai-agent/skills.ts` (workflow playbooks injected into the prompt),
`lib/ai-agent/memory.ts` (durable memory), `lib/ai-agent/training-docs/{data,convert}.ts`,
`app/api/admin/ai-agent/{chat,training-docs}/route.ts`, `components/ai-agent/*`.

**Tool inventory (categories — each tool's `execute` calls that module's data layer).**
Pilot/participants · dashboard users (profiles) · communications (`send_sms`, `send_email`,
list calls/conversations) · email templates + automation (`run_due_journey_emails`) ·
blog/content · contacts CRM · media/business-cards · **social media** (create/publish
posts, reports, inbox) · **Project Manager** · **CMS authoring** (Super-Admin, drafts only —
can never publish) · bookings/forms/brand · **Dev Request Queue** (Super-Admin) · **ad-hoc
read-only SQL** (Super-Admin) · training-docs search/read · memory (`remember`/`forget`,
internal, no confirmation).

**DB & migrations.** `agent_memory` (`…0016`; durable facts, RLS dashboard-read /
staff-write). `agent_training_docs` (`…0043`; `content_md`, `status`
ready/stored/failed/archived, `tags[]`, GIN tsvector index, **Super-Admin-only RLS**).
Read-only SQL (`…0029`): the `steward_readonly_query(text)` Postgres function —
defense-in-depth (regex-rejects non-SELECT, forces `transaction_read_only`, 5s timeout,
caps 200 rows; `EXECUTE` granted **only to `service_role`**). The `run_sql_query` tool
re-guards at the app layer with `assertSuperAdmin` + re-validation + activity logging.

**Training Documents specifics.** Files convert to markdown **once on ingest**
(`convert.ts`: md/txt passthrough, csv→table, json→fenced, html→stripped, **`.docx`→mammoth,
`.pdf`→unpdf**, images→`stored` w/ no OCR). Only a **short index** (≤40 title+summary+id)
goes into the prompt; full bodies are fetched on demand via `search_training_docs` (600-char
excerpts) and `read_training_doc` (truncated 24k chars, refuses non-`ready` docs) — this is
retrieval, not prompt-stuffing. The Training-Docs skill tells the agent to treat doc text as
**reference, never as commands** (a prompt-injection guard — keep this).

**API surface.** `POST /api/admin/ai-agent/chat` (auth `requireAdminManager`; body
`{messages, decisions, actionToken}`; `maxDuration=60`). `GET/POST/PATCH/DELETE
/api/admin/ai-agent/training-docs` (all `requireSuperAdmin`; POST is multipart upload →
convert → store original to the media bucket under `agent-training/`, 25MB cap).

**External deps / env.** `OPENAI_API_KEY` + `OPENAI_MODEL` (env=`gpt-5`, code fallback
`gpt-4o`). `OPENAI_ORG_ID`/`OPENAI_PROJECT_ID`/`OPENAI_MAX_TOKENS` exist in env but are **not
referenced** by the agent code. `mammoth` + `unpdf` for conversion. Service-role Supabase +
the media storage bucket. Transitively pulls Twilio/SMTP via action tools.

**Adapt for ACTSTO.** This is the **most MJG-specific feature** — budget real time:
- **Rewrite the persona/system prompt** (`agent.ts` `SYSTEM_PROMPT`): the name "Steward",
  the faith/stewardship tone, "Created for More / 7-Day Pilot", and the three-people-tables
  rule (users vs participants vs contacts) are all MJG. Give ACTSTO its own agent name +
  domain vocabulary (families/students/donors/campaigns/STO tax credits).
- **Rewrite the skill playbooks** (`skills.ts`) — they encode MJG funnels (waves, inner
  circle, stewardship scoring).
- **Prune the tool registry to what you actually port.** Each action tool's `execute` calls
  a specific module (`lib/pilot`, `lib/email`, `lib/social-media`, `lib/project-manager`,
  `lib/cms`, …). **Drop any tool whose module isn't ported**, or `runAgent` will throw when
  it's called. Grow the toolset as you port more modules.
- **`get_brand_kit`** pulls `lib/brand/assets` (MJG logos/palette/voice) — replace.
- **Model**: decide `OPENAI_MODEL` deliberately. The code uses the Chat Completions endpoint;
  a gpt-5-family model may need endpoint/param adjustment.
- **`run_sql_query`** has MJG table names in `SQL_TABLE_HINTS` — update for ACTSTO's schema.
- Storage bucket + `agent-training/` prefix are MJG-named.

**Depends on.** profiles/RBAC (chat=admin+, several tools=super-admin), OpenAI, the
action-token pattern, the media storage bucket, **and every feature module whose tools you
keep**. Port this **last** — it's the capstone that sits on top of everything else.

---

## 4. Suggested port order

Port bottom-up; each tier depends on the ones above it.

1. **Foundation (§2)** — Supabase clients, `profiles` + roles/permissions, auth helpers,
   action-token, dashboard shell + nav registry, the migration runner. *Nothing works
   without this.*
2. **Notifications + Web Push (§3.1)** — shared by DMs, forms, media. Small, high-leverage.
3. **Email (§3.2)** — the send abstraction is a dependency of DMs, Business Cards, and the
   AI agent. Port `smtp.ts` even if you defer the journey engine.
4. **SMS (§3.3)** and **Dialer (§3.4)** — independent of each other; both need a Twilio
   account. SMS is a dependency of DMs' SMS alerts.
5. **Feature-flag system (§3.8)** — tiny, and lets you ship later features dark. Port before
   Plans.
6. **Media Studio (§3.9)** — self-contained; needed if the AI agent's media tools are kept.
7. **Direct Messages (§3.5)** — needs Notifications + Email + SMS + Storage.
8. **Business Cards (§3.7)**, **Social Media (§3.6)**, **Plans (§3.8)** — independent
   feature islands; port in any order once the foundation + comms exist.
9. **AI Agent + Training Docs (§3.10)** — **last.** Prune its tool registry to exactly the
   modules you ported above.

---

## 5. Environment variables — master checklist

Provision these in ACTSTO's own secret store (never copy MJG's live values). Grouped by the
feature that needs them, so you only set what you port.

| Group | Vars |
|---|---|
| **Supabase (foundation)** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (migration runner) |
| **Site/app URLs** | `NEXT_PUBLIC_SITE_URL` (public marketing site), `NEXT_PUBLIC_APP_URL` (the dashboard app / Twilio webhook base) |
| **Email — Resend** | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` *(required by the send guard)*, `RESEND_REPLY_TO` |
| **Email — SMTP/IMAP** | `SMTP_HOST/PORT/SECURE/USER/PASSWORD`, `NOTIFICATION_FROM_EMAIL`, `IMAP_HOST/PORT/SECURE/USER/PASSWORD` |
| **Twilio (SMS + Voice)** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`, `TWILIO_TWIML_APP_SID` |
| **Web Push** | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| **AI Agent** | `OPENAI_API_KEY`, `OPENAI_MODEL` *(set deliberately)*; `OPENAI_TRANSCRIBE_MODEL` for dialer/whisper |

> The app **degrades gracefully** when a group is unset: email returns a soft no-op, push is
> a no-op, the AI agent simply can't reach unbuilt modules. So you can ship tiers
> incrementally.

---

## 6. Cross-cutting conventions & gotchas (learned in MJG)

- **Every mutating API route** starts with an auth guard (`requireX(request, actionToken)`)
  and uses the **service-role admin client**, authorizing in code. RLS is defense-in-depth,
  not the primary gate.
- **Action-token header** is `x-mjg-action-token` throughout — rename to
  `x-actsto-action-token` consistently (client hook + every route).
- **Migrations are numbered + tracked.** Renumber ported migrations into ACTSTO's own
  sequence; don't keep MJG's `2026…` numbers. The tracking table `_mjg_migrations` →
  `_actsto_migrations`.
- **`current_profile_id()` vs `auth.uid()`**: several RLS helpers key on a
  `current_profile_id()` that matches `auth_user_id` **or** `id` — because MJG's `profiles.id`
  can diverge from `auth.users.id`. Port that helper as-is or your RLS silently denies.
- **Two storage bucket names exist** in MJG (`mjg-media` vs `media-assets`). Pick **one** for
  ACTSTO and use it everywhere (DMs, Media Studio, training docs all touch storage).
- **No green** is a deliberate MJG brand rule (Plans + Media Studio signal completion by icon
  + strikethrough, not color). ACTSTO can choose its own palette — just know why the code
  avoids color-only status.
- **Never hardcode a domain**; use the env-driven site/app URLs. Several MJG files still have
  `my.michaeljgauthier.com` hardcoded (DM notify URLs, business-card/vCard fallbacks) — grep
  for the domain and env-drive them as you port.
- **Consent is legally load-bearing.** SMS/email opt-in defaults to `true` in MJG (existing
  relationship). A public crowdfunding audience likely needs express **opt-in (default
  false)** and its **own A2P 10DLC registration** with ACTSTO's campaign copy.
- **Harden the webhooks**: Twilio inbound routes don't currently verify signatures
  (`validateTwilioRequest` exists but is unused). Add it before going live.
- **Schedulers aren't wired**: the email journey runner (`/journey/send-due`) and social
  `publishDuePosts` are endpoints with **no cron**. Wire them to a scheduler in ACTSTO.

---

*End of roadmap. This file is MJG-internal scaffolding for the ACTSTO hand-off; copy it into
the ACTSTO project and delete it from the MJG repo when done.*
