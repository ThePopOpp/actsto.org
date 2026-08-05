# Parent Portal: Scholarship Application + Household Income

**Implementation spec for actsto.org**

Audience: the developer building this, working with Claude Code.
Companion file: `actsto-application-portal.html` — a working, self-contained prototype. Open it in a browser first. It is the visual and behavioral source of truth for anything this document leaves ambiguous.

Status: **fully specified — no open questions.** Every decision the ACT team was asked for is recorded in §17. If something here looks wrong, raise it rather than reinterpreting it; several of these choices are less arbitrary than they appear.

---

## 1. What we're building

Two connected screens in the authenticated parent portal:

1. **Apply for a scholarship** — a six-step wizard: Family information → Narrative → Financial information → Overflow qualification → ESA status → Review and submit.
2. **Update household income** — a standalone page for editing income on an application already on file.

Both read and write the *same* household income records. A parent who edits income inside step 3 of the wizard sees the change on the standalone page, and the reverse. This is the single most important integration point in the build — do not model household income as per-application form data.

One application per student, per school year.

The prototype covers the parent-facing screens. This document also specifies the pieces around them that the ACT team has since confirmed: the admin review workflow (§8), open/close windows per school year (§9), locking after submission (§10), and document retention (§11).

---

## 2. Stack assumptions — confirm before starting

Inferred from the live site; correct anything wrong before writing code.

| Area | Assumption |
|---|---|
| Framework | Next.js (App Router — `/_next/image` is in use) |
| Language | TypeScript |
| Database + storage | Supabase (a `campaign-media` storage bucket is already live) |
| Auth | Supabase Auth, with a `parent` role — the login page already takes `?role=parent&next=/dashboard/parent` |
| Styling | Tailwind assumed; the prototype uses plain CSS custom properties that map cleanly to a Tailwind theme |

**Ask Claude to verify first, not guess:**

> Read the repo and report back: the framework and router, the styling system, how Supabase clients are created on server vs. client, how auth/session is read in a server component, where shared UI primitives (Button, Input, Select, Card) live, and the existing pattern for form validation. Do not write any code yet.

---

## 3. Routes

```
/dashboard/parent/apply                 → wizard, resumes or starts a draft
/dashboard/parent/apply/[applicationId] → resume a specific draft
/dashboard/parent/household-income      → standalone income editor
```

Keep the active step in the URL as a query param (`?step=narrative`) so back/forward and refresh behave. Steps are named, not numbered, so reordering later doesn't break bookmarks.

Guard rails:

- Not signed in → redirect to `/login?role=parent&next=<path>`.
- A submitted application opens read-only, not editable.
- The household income page is reachable regardless of application state, but shows the "you need an application on file" notice when the parent has none for the current year.

---

## 4. Design tokens

Taken from the live site's theme color plus the prototype. Add to the Tailwind theme rather than hardcoding hex values in components.

```
navy-950  #0b1220   page chrome, sidebar top
navy-900  #101a2d   sidebar base, primary buttons
navy-800  #17253d   ledger gradient end
navy-700  #1f3151   focus rings, links, button hover
gold      #d9a13a   primary CTA, active nav, step marker
gold-600  #c2871f   eyebrow text, small accents
gold-100  #fbf1dd   documentation sub-panels
paper     #f5f6f8   page background
surface   #ffffff   cards
ink       #131c2b   body text
ink-soft  #5b6879   secondary text
ink-faint #8c98a8   labels, empty states
line      #e4e8ee   borders
tint      #eef2f8   quiet buttons, avatars
info      bg #eef4fb / border #cfe0f2 / text #1c4472
warn      bg #fdf3e0 / border #ecd3a0 / text #6b4a12
ok        bg #e9f5ee / border #bfe0cb / text #2c7a54
danger    bg #fbecec / text #b03a3a
```

Type: **Fraunces** for headings and figures, **Inter** for everything else. Tabular numerals on every currency value (`font-variant-numeric: tabular-nums`) so columns align.

Radii 10–14px. Shadows stay soft and low-contrast; this is a form, not a marketing page.

---

## 5. Data model

Table and column names are suggestions — match existing repo conventions.

### `household_members`

Owned by the parent, **not** by an application.

```sql
id                uuid primary key default gen_random_uuid()
parent_id         uuid not null references profiles(id) on delete cascade
full_name         text not null
role_label        text                    -- free text: "Parent", "Child", "Student · 8th grade"
work_amount       numeric(12,2) not null default 0
work_frequency    income_frequency not null default 'annually'
support_amount    numeric(12,2) not null default 0
support_frequency income_frequency not null default 'annually'
retirement_amount numeric(12,2) not null default 0
retirement_frequency income_frequency not null default 'annually'
other_amount      numeric(12,2) not null default 0
other_frequency   income_frequency not null default 'annually'
created_at        timestamptz not null default now()
updated_at        timestamptz not null default now()
```

```sql
create type income_frequency as enum
  ('annually','monthly','semimonthly','biweekly','weekly');
```

**Store the amount and the frequency as entered.** Never store only an annualized figure — parents need to see their own numbers when they come back to edit. Annualize in a shared pure function:

```ts
const MULTIPLIER = { annually:1, monthly:12, semimonthly:24, biweekly:26, weekly:52 } as const;
export const toAnnual = (amount: number, frequency: IncomeFrequency) =>
  Math.round(amount * MULTIPLIER[frequency]);
```

Use that one function everywhere — table cells, totals, review, and any award calculation — so a parent, a reviewer, and the awarding logic never see different numbers.

### `applications`

```sql
id                  uuid primary key
parent_id           uuid not null references profiles(id)
student_id          uuid not null references students(id)
school_year         text not null            -- '2026/2027'
school_id           uuid references schools(id)
grade               text
tuition_after_discounts numeric(10,2)
narrative           text
overflow_qualification text not null default 'none'  -- enum slug, see §7 step 4
overflow_org        text                     -- only when qualification = 'prior-award'
overflow_comments   text
esa_current_year    text                     -- 'yes' | 'no' | 'unsure'
esa_prior_year      text                     -- 'yes' | 'no'
status              application_status not null default 'draft'
certified_at        timestamptz
income_confirmed_at timestamptz              -- parent affirmed income is current for THIS year
income_confirmed_by uuid references profiles(id)
submitted_at        timestamptz
confirmation_code   text unique
income_snapshot     jsonb                    -- see below
window_id           uuid references application_windows(id)
locked_at           timestamptz              -- set on submit; non-null means parent-read-only
needs_info_due_at   timestamptz              -- set on a request_info action; see §8
reopened_by         uuid references profiles(id)   -- staff who unlocked, if ever
reopened_at         timestamptz
attempt_number      int not null default 1         -- 1, 2, 3… within a school year
supersedes_id       uuid references applications(id)  -- the denied attempt this replaces
created_at, updated_at timestamptz
```

**Do not put `unique (student_id, school_year)` on this table.** A denied family may reapply in the same year (confirmed by the ACT team), so multiple applications per student-year are legitimate. What must be unique is the number of *live* ones:

```sql
create unique index one_live_application_per_student_year
  on applications (student_id, school_year)
  where status not in ('denied','withdrawn');
```

A partial index gives you exactly the guarantee you want — a family can never have two applications in flight, but a denied one doesn't block a fresh attempt. See §8 for the resubmission flow.

No award amount lives on this table. Awarding is a separate process downstream of approval — see §8.

```sql
create type application_status as enum
  ('draft','submitted','under_review','needs_info','approved','denied','withdrawn');
```

`needs_info` is a real state, not a note on a denial — the parent gets an email, the application reopens for the specific fields staff asked about, and it returns to `under_review` on resubmit.

### `application_documents`

```sql
id, application_id, storage_path, file_name, file_size, mime_type, uploaded_at
document_kind     text          -- 'iep', 'military_orders', 'esa_closure', 'enrollment', 'other'
verified_at       timestamptz   -- staff confirmed it supports the claimed qualification
verified_by       uuid references profiles(id)
purge_after       date not null -- see §11, retention
purged_at         timestamptz   -- file gone from storage, row kept as an audit trail
```

### `application_reviews`

Append-only. Every staff decision writes a row; the application's `status` is just the latest one. Never overwrite a decision — you will eventually need to show a parent or an auditor how a determination was reached.

```sql
id              uuid primary key
application_id  uuid not null references applications(id) on delete cascade
reviewer_id     uuid not null references profiles(id)
action          review_action not null
internal_note   text          -- staff eyes only, never surfaced to the parent
parent_message  text          -- sent verbatim to the parent on 'request_info' and 'deny'
fields_requested text[]       -- which sections reopen on 'request_info'
due_at          timestamptz   -- request_info only: 30 days out, see §8
created_at      timestamptz not null default now()
```

```sql
create type review_action as enum
  ('claim','approve','deny','request_info','reopen','note','expire');
```

Keep `internal_note` and `parent_message` as separate columns. One combined field guarantees that internal commentary eventually reaches a family.

### Staff roles

Document access is restricted by role. Today that's admin only, but build it as a lookup rather than a hardcoded `role === 'admin'` check scattered through the codebase — ACT expects to add reviewer tiers later.

```sql
create type staff_role as enum ('admin');   -- extend: 'reviewer', 'read_only', 'finance'
```

```sql
-- profiles.staff_role staff_role  (null for parents/donors)
```

Gate on a named capability, not on the role string:

```ts
const CAPABILITIES: Record<StaffRole, Capability[]> = {
  admin: ['review.claim','review.decide','documents.view','application.reopen','windows.manage'],
};
export const can = (role: StaffRole | null, cap: Capability) =>
  !!role && CAPABILITIES[role].includes(cap);
```

Adding a role later then means one entry in that map, not an audit of every call site.

### `application_windows`

```sql
id             uuid primary key
school_year    text not null unique     -- '2026/2027'
opens_at       timestamptz not null
closes_at      timestamptz not null
late_grace_until timestamptz            -- nullable; drafts already started may still submit
is_published   boolean not null default false
created_at, updated_at timestamptz
```

Windows are data, not constants in code. Staff will move these dates, and they should not need a deploy to do it.

### `student_year_eligibility`

**This is the table the awarding process reads.** Confirmed by the ACT team: eligibility is read from the student's record, scoped to the school year matching the potential award — not from application status.

That scoping matters, and it's why this is a table rather than a set of columns on `students`. A qualification is often true for one year and not the next: a kindergarten entrant is not a kindergarten entrant twelve months later, and a district-school transfer qualifies for the year of the move. Flat columns on `students` would let last year's answer silently authorize this year's award.

```sql
id                      uuid primary key
student_id              uuid not null references students(id) on delete cascade
school_year             text not null              -- '2026/2027'
overflow_eligible       boolean not null default false
overflow_qualification  text                       -- slug, or 'none'
verified_at             timestamptz not null
verified_by             uuid not null references profiles(id)
source_application_id   uuid not null references applications(id)
revoked_at              timestamptz                -- set if a later review overturns it
revoked_reason          text
created_at, updated_at  timestamptz
unique (student_id, school_year)
```

Rules:

- **Only an approval writes here.** A parent's claim on an application is not eligibility; staff verification during review is. Nothing else in the system may insert into this table.
- The awarding process queries `(student_id, school_year)` and treats a row with `overflow_eligible = true` and `revoked_at is null` as authorization. It should never need to look at `applications.status` to decide, and never need to join across attempts.
- `source_application_id` is the audit trail back to which application — which *attempt*, see below — produced the finding.
- Overturning a decision sets `revoked_at` rather than deleting the row. Awarding must check for it.

**Check `revoked_at` twice: at award time and again at disbursement.** Confirmed by the ACT team. These are separate moments, sometimes months apart, and things surface in between — an ESA contract signed after approval, documentation that turns out not to support the claim, a student who leaves the partner school. An award made against a finding that has since been revoked must not pay out.

Make it a shared guard rather than two independent checks that can drift:

```ts
export async function assertEligible(studentId: string, schoolYear: string) {
  const row = await getEligibility(studentId, schoolYear);
  if (!row)              throw new IneligibleError('no_verified_eligibility');
  if (row.revoked_at)    throw new IneligibleError('revoked', row.revoked_reason);
  return row;
}
```

Call it from both paths. Log every disbursement-time failure loudly — a revocation caught at that stage means an award was made on something that later changed, and staff need to know before the family does. Do not fail silently into a skipped payment; a family expecting tuition help that quietly doesn't arrive is the worst possible version of this.

On next year's application, prefill step 4 from the most recent year's row and ask the parent to confirm it still applies. Prefill is a starting point for a question, never an answer carried forward on its own.

### `income_snapshot` — important

When an application is submitted, write a frozen JSON copy of the household members and the computed total onto the application. Reviewers must see what was certified at submission time, not whatever the parent edited afterward. The live `household_members` rows keep changing; the snapshot does not.

```json
{
  "captured_at": "2026-08-03T18:04:00Z",
  "member_count": 5,
  "annual_total": 214600,
  "members": [
    { "full_name": "Marcus Ellison", "role_label": "Parent",
      "work": { "amount": 136800, "frequency": "annually", "annual": 136800 },
      "support": { "amount": 0, "frequency": "annually", "annual": 0 },
      "retirement": { "amount": 0, "frequency": "annually", "annual": 0 },
      "other": { "amount": 15400, "frequency": "annually", "annual": 15400 },
      "annual_total": 152200 }
  ]
}
```

### Row-level security

Every table above needs RLS keyed to `auth.uid() = parent_id` (documents joined through their application). Staff/reviewer roles get read access through a separate policy. Do not rely on route guards alone.

---

## 6. Autosave and drafts

The wizard promises "your answers save as you go." Make that true.

- A draft `applications` row is created on first entry to the wizard.
- Debounce field writes ~800ms; also flush on step change, on `Save and finish later`, and on `beforeunload`.
- Show save state honestly — "Saving…", "Saved", or an error with a retry. A failed save must never look like a success.
- `Save and finish later` writes, toasts, and routes to the dashboard.
- Household income edits save immediately on modal submit, independent of the draft.

---

## 7. Step-by-step requirements

### Step 1 — Family information

- Parent name, phone, and address are **read-only**, sourced from the profile, with an amber notice pointing to the profile page to change them.
- Student select lists the parent's students; `Add a student` opens the existing student-creation flow and returns to the wizard with the new student selected.
- School year, grade, school (from the partner-schools table), and tuition after discounts.
- Tuition label matters: it is the amount the family still owes for the year, **not** the school's published rate. Keep the helper text.
- Required: student, year, grade, school, tuition ≥ 0.

### Step 2 — Narrative

- Textarea with a live word count. 150–400 words is the guidance; under 25 words blocks advancing.
- Guidance text must keep the point that financial detail belongs in the financial step, not here.
- Do not impose a hard maximum — warn, don't truncate.

### Step 3 — Financial information

- Household headcount is **derived** from the member list and read-only. No free-typed number that can contradict the table.
- Renders the shared income ledger component (§12).
- Blocks advancing with zero members. Members with no income are fine and expected — zero is a valid answer, an empty roster is not.

**Annual re-confirmation is required.** Household income carries forward between years, so a returning parent sees last year's figures already filled in. That's a convenience, not an assertion — the parent must actively confirm the numbers are current before advancing:

- A checkbox below the ledger: *"I confirm this income is accurate for the 2026/2027 school year."* Name the year explicitly; a generic "I confirm" is easier to click past.
- Unchecked blocks the step. Do not pre-check it, and do not treat a page visit as confirmation.
- Checking it writes `income_confirmed_at` and `income_confirmed_by` on **this year's** application. A confirmation from a prior year never satisfies the current one.
- Any edit to the household after confirming clears `income_confirmed_at` and unchecks the box. Adding a member while a stale confirmation sits on the record is precisely the failure this guards against.
- If the carried-forward figures are more than 12 months old, say so above the ledger — "These figures were last updated in March 2025" — so the parent knows what they are being asked to vouch for.
- Review displays the confirmation date, and submission is blocked without it.

This is the step a returning parent is most likely to click through on autopilot, and it is the data they are certifying at submission. Make the friction deliberate.

### Step 4 — Overflow qualification

Single-select. Slugs and labels:

| Slug | Label | Needs docs |
|---|---|---|
| `transfer` | Moved from an Arizona district or charter school | no |
| `disability` | Student with a disability | yes |
| `preschool` | Preschooler with a disability | yes |
| `kinder` | Entering kindergarten | no |
| `military` | Dependent of an active-duty service member | yes |
| `homeschool` | Homeschooled in Arizona last year | yes |
| `outofstate` | Moved to Arizona from another state or country | yes |
| `esa-prior` | Previously held an ESA | yes |
| `prior-award` | Received an Overflow or Corporate scholarship before | no, but requires the awarding organization |
| `none` | None of these apply to my student | no |

- Selecting a `needs docs` option expands an inline gold panel saying documentation is required.
- Selecting `prior-award` expands an organization select.
**Decision: a qualification is optional, but an *answer* is required.** Add the explicit `none` option — "None of these apply to my student" — and require the parent to pick something before advancing. This is the one change from the prototype in this section, and it matters:

- A blank field is ambiguous. It could mean "doesn't apply," "didn't understand the question," or "meant to come back to this." An explicit `none` is a real answer you can act on.
- Reviewers can then distinguish an unanswered application from a genuinely Original-only one without contacting the family.
- If a parent selects `none`, the step shows a short reassurance: their student is still fully considered for the Original scholarship, and nothing is lost by having no qualifying event. Parents read a list of nine things they don't qualify for as bad news unless you tell them otherwise.
- Selecting `none` is not permanent. Note that they can update it later if their situation changes — a mid-year move or a new IEP is exactly the kind of thing that arrives after submission.

**Verified eligibility lives in `student_year_eligibility`, keyed to the student and the school year** (§5). Flow:

1. Parent claims a qualification on the application.
2. Staff verify it during review; approval writes the finding for that school year.
3. Next year's application prefills from the most recent year's row, with the parent confirming rather than re-deriving it.

Prefilling across years is a convenience for the parent, not a carry-forward of the finding. Each year's eligibility is verified on that year's application — several of these qualifications are true once and never again.

Keep the parent's *claim* and the staff *verification* as separate facts. A claimed-but-unverified qualification must never read as verified anywhere in the system — that distinction is what protects the award determination.
- File upload: drag-and-drop plus a file picker. Accept JPG, PNG, PDF. Cap at 10MB per file. Upload to Supabase storage under `applications/{applicationId}/`, insert an `application_documents` row, show real progress, and let the parent remove a file (delete the object *and* the row).

### Step 5 — ESA status

- Both questions required; block advancing with inline errors, not just a toast.
- Explanatory copy stays — parents genuinely misunderstand this. Key points to preserve: ESAs are administered by the Arizona Department of Education, not by ACT; funds can't be sent to a school while a signed contract is in place; an award can still be made and held in the student's name pending documentation that the contract closed or lapsed, provided the parent reapplies each year and enrollment is continuous.
- If `esa_current_year = 'yes'`, flag the application for the reviewer queue as award-held-pending-documentation.

### Step 6 — Review and submit

- Every field displayed with its **real value**. Never blur or truncate on the parent's own review screen — this is the last chance to catch an error.
- Missing values render in red with a specific message ("Not answered", "No grade selected"), never as an empty cell.
- Income shown as a full table with per-person and household totals.
- Per-section Edit buttons jump back to that step.
- Certification checkbox gates the submit button. Record `certified_at`.
- On submit: validate the whole application server-side, set status, write `submitted_at`, generate a confirmation code (`ACT-2627-4831`), write `income_snapshot`, send the confirmation email, and show the success state with the code.
- Server-side validation is mandatory. Client validation is a courtesy; treat every submission as untrusted.

---

## 8. Admin review workflow

Submitted applications go to the admin team, who **approve**, **deny**, or **request more information**. The reviewer UI is a separate build, but the schema and events belong here because they constrain the parent-facing side.

### States

```
draft → submitted → under_review → approved
                                 → denied ──→ [new application, attempt n+1] → draft → …
                                 → needs_info → (parent updates) → under_review
                                              → (30 days, no response) → under_review, flagged
```

A denial is terminal *for that application row*. The family's path forward is a new row, not a revived one (see "Resubmission after a denial").

- `submitted` → `under_review` on the first `claim` action, so two reviewers don't work the same application.
- Every transition writes an `application_reviews` row. The application's status is derived from the latest row.

### Request more information

The most important of the three actions, and the easiest to build badly.

- Staff pick which sections reopen (`fields_requested`) and write a `parent_message` explaining what's needed.
- The parent gets an email and a dashboard item. Opening the application reopens **only** the requested sections; everything else stays read-only.
- Resubmitting returns it to `under_review` and notifies the assigned reviewer.

**The parent has 30 days.** Set `needs_info_due_at = now() + 30 days` on the `request_info` action, and store it on the review row too so the history shows what the deadline was at the time.

- The deadline is visible everywhere the request appears: the email, the dashboard item, and the application header. State the actual date — "Please respond by 12 September 2026" — not "within 30 days," which forces the parent to do arithmetic and gets it wrong.
- Remind by email at 14 days, 7 days, and 1 day remaining. Stop reminding once they respond.
- Any staff member can extend the deadline. Extensions write a new review row rather than editing the old one.
- Responding at any point before the deadline stops the clock and returns the application to `under_review`.

**When 30 days pass with no response:** a scheduled job writes an `expire` review row and moves the application back to `under_review` — *not* to denied. The application returns to the queue exactly as submitted, flagged as awaiting-information-not-received, and staff make the call. An automated denial is the wrong default here: the most common reason a family misses this window is that the email went to spam or the parent is dealing with something hard, and having software deny them for it is both bad practice and bad pastoral care. Let a person decide.

- The parent can still respond after expiry; it re-flags the application for review.
- Build the stale-request report early. Applications that sit in `needs_info` are where they go to die, and 30 days passes quickly during a school year.

### Approve and deny

**Approval determines eligibility, not money.** Awarding is a separate downstream process, confirmed by the ACT team. Approval means the application is complete, the household qualifies, and the student is eligible to be considered for an award. It sets no amount, reserves no funds, and promises nothing.

That constraint shapes three things:

- No award columns on `applications`. When the awarding process is built, it gets its own table referencing the application. Do not add an `award_amount` field now "just to have it" — the first time a number appears in that column, someone will treat it as a decision.
- Approval emails must not read like award notifications. Say the application was approved and that award decisions follow separately, with timing if you can give it. Families read "approved" as "we're getting money" unless you're explicit, and correcting that later is a painful conversation.
- The parent-facing status label should be plain: *Approved — pending award decision*, never a bare "Approved."
- Denying requires a `parent_message`. A denial with no explanation generates a phone call every time, which costs staff more than writing the sentence.
- If the application claimed an Overflow qualification, approval is the moment to write the verified finding to `student_year_eligibility` for that school year (§5). Only approval writes there.
- If `esa_current_year = 'yes'`, approval means award-held-pending-ESA-documentation, not funds released. Make that a distinct, visible state rather than a note in a comment field.

### Resubmission after a denial

Confirmed: a denied family may submit a new application for the same school year. This is the flow most likely to produce a reporting mess, so build the tracking with it rather than after.

**How it works:**

- A denied application stays denied forever. It is never edited, never reopened, never mutated into the new attempt. It's the historical record of a decision.
- "Apply again" creates a **new** application row with `attempt_number = previous + 1` and `supersedes_id` pointing at the denied one. The partial unique index (§5) permits this because the old row is `denied`.
- The new attempt imports from the denied one so the family edits rather than retypes. What carries and what doesn't:

| Imports automatically | Requires fresh action |
|---|---|
| Student, school year, school, grade, tuition | Income confirmation (§7 step 3) — cleared and re-required |
| Narrative | Certification checkbox — a new application is a new certification |
| Overflow qualification, awarding org, comments | ESA answers prefill, but the step shows a "confirm these are still accurate" note |
| Uploaded documents, relinked not re-uploaded | Anything staff cited in the denial message |
| Household members (parent-owned; nothing to import) | — |

- Document import copies the `application_documents` row to the new application pointing at the **same storage object** — the parent should not re-upload an IEP because of a paperwork outcome. Set a fresh `purge_after` from the new application. If the original was already purged, the row imports as missing and the parent is asked to re-upload; say which document and why.
- Show what was imported. A screen that silently looks filled-in invites clicking straight to submit without rereading the thing that got denied. A short banner — "We've brought over your previous answers. Review each section before submitting." — is enough.
- The window must still be open. A denial does not extend a deadline; if the window has closed, resubmission goes through staff like any other exception (§9).
- Denial emails should say plainly whether reapplying is possible and by when. Families do not know this, and the alternative to telling them is a phone call.

**Tracking a denied → resubmitted → approved chain.** This is the case you flagged, and there are two questions it has to answer cleanly: *what is this student's status now?* and *how did we get here?*

- **Status now** comes from the live application — the one not in `denied`/`withdrawn`. Only one exists at a time, so "what's happening with this student" never requires reconciling conflicting rows.
- **How we got here** comes from following `supersedes_id` backward. Give it a view rather than making every consumer write the recursion:

```sql
create view application_chains as
with recursive chain as (
  select id, id as root_id, student_id, school_year, attempt_number, status, supersedes_id
    from applications where supersedes_id is null
  union all
  select a.id, c.root_id, a.student_id, a.school_year, a.attempt_number, a.status, a.supersedes_id
    from applications a join chain c on a.supersedes_id = c.id
)
select * from chain;
```

Reporting rules that keep the numbers honest:

- **Count outcomes per student-year, not per application row.** A student denied then approved is one approved student, not one denial plus one approval. Reporting on raw rows will overstate both your denial rate and your total applicants — and STO annual reporting is not the place to discover that.
- Keep a separate count of *attempts* as its own metric. "How many families had to apply twice" is genuinely useful: a high number usually means a form problem or an unclear documentation request, not careless families.
- **Soft flag at attempt 3.** Confirmed by the ACT team. Creating a third attempt for one student-year raises a flag on the reviewer queue — it does not block the parent, who can still apply. The flag says a family is stuck, and by attempt three the cause is usually something a two-minute phone call fixes faster than a fourth round of the form. Route it to staff for outreach, not for enforcement. Keep it soft: no hard cap, no lockout, no automated rejection.
- The reviewer UI shows the full chain on any attempt, with the prior denial's `parent_message` visible. Reviewing attempt 2 without seeing why attempt 1 was denied wastes everyone's time and risks a second denial for the same fixable reason.
- `student_year_eligibility` is keyed to the student-year, so an approval on attempt 2 writes the row that attempt 1's denial never created. `source_application_id` records which attempt earned it.

### Notifications

Email on: submission received, information requested, needs-info reminders (14/7/1 days), approved, denied, and resubmission received. Each links straight to the relevant screen. The denial email must state whether reapplying this year is possible and by what date. Send through whatever transactional provider the site already uses; do not add a second one.

---

## 9. Application windows

Each school year has a date range during which the wizard accepts applications. `application_windows` (§5) holds them.

Parent-facing behavior:

| Situation | What the parent sees |
|---|---|
| Before `opens_at` | Wizard is read-only with the opening date and an email-me-when-it-opens option. |
| Open | Normal wizard. Show the closing date in the header once inside 30 days, without a countdown timer — this is a scholarship application, not a flash sale. |
| Closed, no draft | Clear message with the next window's dates if published, and a link to contact staff about exceptions. |
| Closed, draft exists | This is the case that generates angry emails. If `late_grace_until` is set and unexpired, allow submission with a visible "submitting after the deadline" notice. Otherwise the draft is preserved, read-only, with instructions to contact staff. **Never silently delete a draft because a window closed.** |
| Already submitted | Read-only, with status. |

Enforce the window **server-side on submit**, checked against the window row at that moment. A wizard left open in a browser tab across the deadline must not be able to submit.

Warn parents with an unsubmitted draft by email at 14 days, 3 days, and on the final day. Most incomplete applications are forgotten, not abandoned.

---

## 10. After submission: locked to parents

Confirmed rule: **once submitted, a parent cannot edit — they contact staff.**

- Submitting sets `locked_at`. Any write path checks it server-side, not just in the UI.
- The parent still sees the full application, read-only, with every value visible. Do not hide it behind a "contact us" wall; they need to reference what they sent.
- Show a clear line explaining the application is locked and how to reach staff, with the confirmation code visible for reference.
- The one exception is `needs_info`, which reopens only the requested sections (§8).
- Staff can unlock: a `reopen` review action clears `locked_at`, records `reopened_by` and `reopened_at`, and emails the parent that their application is editable again with a deadline for resubmitting.
- **Household income stays editable regardless.** It belongs to the parent, not the application, and the income snapshot already protects what was certified. A parent updating income after submission does not alter their submitted application — make sure the standalone page says so explicitly, or it will look like a bug.

---

## 11. Document retention

You asked what I'd suggest. This is a recommendation to take to your CPA and counsel, not a legal opinion — I'm not a lawyer, and the binding answer depends on your auditor's requirements and ADOR guidance for certified STOs.

### The principle

These uploads are the most sensitive data in the system: disability determinations, IEP and 504 plans, military orders, ESA contract records. Some of it is protected health-adjacent information about children. The safest file is one you no longer store.

**Keep the verification, delete the artifact.** Staff review a document to confirm a qualification. Once verified, what you need long-term is the *finding* — who verified what, when, based on which kind of document. You do not need the IEP itself. Retaining the finding permanently and the file briefly gives you a defensible audit trail at a fraction of the exposure.

### Suggested schedule

| Record | Retain | Rationale |
|---|---|---|
| Application record, income snapshot, review history | 7 years, or whatever your auditor requires for donation and scholarship records | Survives the annual STO audit and any ADOR review of that award year |
| Verification metadata (`verified_at`, `verified_by`, `document_kind`) | Same as the application | This is the audit trail |
| **Uploaded document files** | Until the annual audit for that award year is complete, then purge — with a floor of 12 months post-submission and a hard ceiling of 4 years | Shortest period that still survives audit |
| Denied or withdrawn applications | Purge files 12 months after the final decision | No award, no ongoing audit interest |
| Unsubmitted drafts | Purge files 12 months after the window closes | Never certified; no reason to hold them |

Arizona law requires certified STOs to file annual reports and to be audited or financially reviewed each year (A.R.S. Title 43, Ch. 16). Whatever period you land on, the rule that cannot be broken is: **never purge before the audit covering that award year is complete.** Have your CPA give you that date in writing, and set the schedule from it.

### Implementation

- `purge_after` is a real column, set at upload time from the window's school year. A purge job runs on a schedule, deletes the storage object, sets `purged_at`, and leaves the row. Manual cleanup does not happen; automated cleanup does.
- Private bucket, no public URLs, ever. Serve through short-lived signed URLs (5–15 minutes) generated server-side after an authorization check.
- Encrypt at rest. Supabase storage does this, but confirm rather than assume.
- Log every access to a document: who, when, which file. If a family ever asks who saw their child's IEP, you want to answer precisely.
- Restrict document access to the `documents.view` capability, held today by admin only (§5, staff roles). Not everyone who can see an application needs to open its attachments, and when ACT adds reviewer or finance roles later, that stays true by default rather than by remembering to re-check.
- Parents can delete their own files before submission. After submission, deletion requests go through staff.
- Publish the retention period in your privacy policy and state it plainly at the upload step: what you're collecting, why, and how long you keep it. Families handing over a child's disability records deserve to be told.

---

## 12. Shared component: `HouseholdIncomeLedger`

Used by both the wizard step and the standalone page. Props: `{ parentId, readOnly?: boolean }`.

- Navy gradient header: annualized household total, member count, and the "Add a member" CTA.
- Table columns: Member (avatar with initials, name, role) · Employment · Support · Retirement · Other · Yearly total · Manage.
- Zero values render in muted grey, not hidden — a zero is meaningful data.
- On narrow screens, collapse the three middle income columns and keep Employment plus Yearly total.
- Edit and Remove per row; Remove confirms and explains the consequence.
- Empty state invites action rather than reporting nothing.
- Add/Edit modal: name, optional role, then amount + frequency per category, with a running yearly total in the footer that updates as you type.
- Footer line shows when income was last updated, from `max(updated_at)`.

---

## 13. Accessibility and quality floor

Non-negotiable, and cheap if done as you go:

- Every input has a real `<label>`; the stepper is a `<nav>` with `aria-current` on the active step.
- Visible focus rings on every interactive element — do not remove outlines without replacing them.
- Errors are associated to inputs via `aria-describedby`, and focus moves to the first error on a failed advance.
- The modal traps focus, closes on Escape, and returns focus to the trigger.
- Respect `prefers-reduced-motion`.
- Full keyboard path from step 1 through submit, with no mouse.
- Colour is never the only signal — errors carry text, not just red borders.
- Works down to 360px wide.
- Currency and word counts announced via a polite live region where they change dynamically.

---

## 14. Suggested build order

Land these as separate PRs; each is independently reviewable.

1. Migrations, enums, RLS policies, and the `toAnnual` helper with unit tests.
2. `HouseholdIncomeLedger` plus its modal, wired to real data, on the standalone page.
3. `application_windows` with an admin editor, plus the window-state gate on the wizard entry point. Build this before the wizard so every later step is developed against a real open/closed state rather than having it retrofitted.
4. Wizard shell: routes, stepper, autosave, draft creation, navigation guards.
5. Steps 1, 2, 3.
6. Step 4, including the `none` option, eligibility prefill, and uploads to Supabase storage with `purge_after` set on write.
7. Step 5.
8. Review, server-side validation, submission, lock, snapshot, confirmation email.
9. Post-submission read-only view for parents.
10. Admin review queue: claim, approve, deny, request info, plus the notification emails. Approval writes `student_year_eligibility`.
11. The `needs_info` return path — reopening only the requested sections — and the resubmit-after-denial path with `supersedes_id` chaining.
12. Retention purge job, access logging, and signed-URL document serving.
13. Accessibility and responsive pass, then QA against §15.

Items 1–9 are a shippable parent-facing release. Items 10–11 can follow if staff are willing to review the first cohort manually, but do not let 12 slip — sensitive files accumulating with no purge path is the kind of debt that gets worse silently.

---

## 15. QA checklist

- [ ] Editing income in the wizard updates the standalone page, and the reverse.
- [ ] Frequencies annualize correctly: weekly ×52, biweekly ×26, semimonthly ×24, monthly ×12.
- [ ] A member with all-zero income saves and appears.
- [ ] Refreshing mid-wizard restores every answer.
- [ ] Back/forward buttons move between steps correctly.
- [ ] Advancing without ESA answers is blocked, with inline errors.
- [ ] Review shows every value unblurred, with red markers on anything missing.
- [ ] Submit is disabled until certification is ticked.
- [ ] A submitted application reopens read-only.
- [ ] `income_snapshot` does not change when household income is edited after submission.
- [ ] A second application for the same student and year is rejected.
- [ ] Parent A cannot read or write Parent B's rows — test directly against the API, not just the UI.
- [ ] Uploads reject oversized and disallowed file types with a clear message.
- [ ] Full keyboard-only run through submission.
- [ ] Usable at 360px wide.

Windows and locking:

- [ ] Advancing past step 3 is blocked until income is confirmed for the current year.
- [ ] Editing a household member after confirming clears the confirmation and unchecks the box.
- [ ] A prior year's confirmation does not satisfy the current year's application.
- [ ] Advancing past step 4 is blocked until a qualification — including `none` — is chosen.
- [ ] A wizard left open across `closes_at` cannot submit; the server rejects it.
- [ ] A draft that exists when the window closes is preserved read-only, never deleted.
- [ ] A submitted application cannot be modified through the API, not merely through the UI.
- [ ] Editing household income after submission leaves the submitted application and its snapshot untouched.
- [ ] Staff `reopen` clears the lock and emails the parent.

Review workflow:

- [ ] `request_info` reopens only the listed sections; everything else stays locked.
- [ ] `needs_info_due_at` lands 30 days out and shows as a real date in the email, dashboard, and header.
- [ ] Expiry moves the application to `under_review` flagged as no-response — never to denied.
- [ ] A parent responding after expiry re-flags the application.
- [ ] Resubmitting after `needs_info` returns the application to `under_review`.
- [ ] Approval emails and status labels never imply an award amount.
- [ ] No award columns exist on `applications`.
- [ ] Approval writes a `student_year_eligibility` row for the correct school year; nothing else writes to that table.
- [ ] A denied application can be followed by a new attempt in the same year, with `attempt_number` and `supersedes_id` set.
- [ ] The partial unique index blocks two live applications for one student-year, but permits one denied plus one live.
- [ ] Resubmitting after a denial requires fresh income confirmation and a fresh certification.
- [ ] Imported documents point at the same storage object, with a fresh `purge_after`, and are not re-uploaded.
- [ ] A document purged before resubmission imports as missing, naming the file and asking for it again.
- [ ] The imported-data banner appears on every step of a resubmission.
- [ ] Resubmission is blocked once the window has closed.
- [ ] A denied → resubmitted → approved student counts once in outcome reporting, not twice.
- [ ] The reviewer UI shows the prior denial's message when reviewing a later attempt.
- [ ] Last year's eligibility row never authorizes a current-year award on its own.
- [ ] Eligibility is re-checked at disbursement, not only at award time.
- [ ] A revocation between award and disbursement stops the payment and alerts staff — loudly, never silently.
- [ ] A third attempt for one student-year flags the reviewer queue without blocking the parent.
- [ ] `internal_note` never appears in any parent-facing view or email.
- [ ] Approving a verified Overflow qualification writes eligibility to the student record.
- [ ] An approval with `esa_current_year = 'yes'` shows as award-held, not funds-released.

Documents:

- [ ] Document URLs are signed and expire; a copied link fails after its TTL.
- [ ] `purge_after` is set on every upload at write time.
- [ ] The purge job deletes the storage object, sets `purged_at`, and keeps the row.
- [ ] A non-reviewer staff account cannot open an attachment.

---

## 16. Working with Claude on this

Point Claude Code at this file and the prototype together:

> Read `IMPLEMENTATION-SPEC-parent-application.md` and `actsto-application-portal.html`. The HTML is a working prototype — treat it as the reference for layout, copy, and interaction, but reimplement it in our stack and component conventions rather than porting the markup. Start with section 14 item 1 only: the migrations, enums, RLS policies, and the `toAnnual` helper with tests. Show me the migration before applying it.

Guidance that keeps this on the rails:

- Work one build-order item at a time and review between them. A single prompt for the whole feature produces a large diff nobody reads carefully.
- Have Claude read existing components before writing new ones — the repo already has form primitives, and a second parallel set of them is worse than a slightly imperfect fit with the first.
- Ask for the RLS policies and a test that a second parent is denied access. Auth bugs here expose family financial data.
- Ask Claude to explain any place it departs from this spec. Departures are often right; silent ones aren't.
- The copy in the prototype is deliberate — plain verbs, sentence case, specific error messages. Ask Claude to preserve it rather than regenerate it. If the wording changes, it should be a decision, not a side effect.

---

## 17. Decisions on file

Answered by the ACT team. Treat these as settled; raise a question rather than reinterpreting one.

| Question | Decision |
|---|---|
| Is an Overflow qualification required? | Optional — not every family has a qualifying event. But an explicit `none` answer is required, and verified eligibility is tracked on the student record (§7 step 4, §5). |
| Validate tuition against a school figure? | No. Trusted as entered for now. |
| Who reviews applications? | The admin team, on the backend. Approve, deny, or request more information per application (§8). |
| Can a parent edit after submitting? | No. They contact staff, who can reopen it (§10). |
| Deadline behavior? | Each school year has an open/close date range, stored as data (§9). |
| Document retention? | Recommendation in §11 — keep the verification, purge the file. Needs sign-off from your CPA and counsel before it's final. |

| Does approval set an award amount? | No. Awarding is a separate downstream process. Approval means eligible, nothing more (§8). |
| Re-confirm household income each year? | Yes. Explicit per-year confirmation at step 3, cleared by any subsequent edit (§7 step 3). |
| Who can open documents? | Admin only for now, gated by a named capability so further roles drop in cleanly (§5, §11). |
| Deadline on a `needs_info` request? | 30 days from the request. On expiry it returns to `under_review` flagged as no-response, never auto-denied (§8). |

| Where does awarding read eligibility? | From `student_year_eligibility`, matched to the school year of the potential award — never from application status (§5). |
| Can a denied family reapply in the same year? | Yes, as a new attempt chained by `supersedes_id`, while the window is open. Outcomes are counted per student-year, not per row (§8). |

| Re-check eligibility before funds are sent? | Yes. `revoked_at` is checked at award time and again at disbursement, through one shared guard (§5). |
| Limit on resubmission attempts? | No hard limit. A soft flag at attempt 3 routes the family to staff for outreach (§8). |

### Still open

Nothing. Every question raised during this spec has been answered by the ACT team. Anything new should be added to the table above with the date and who decided it, so the reasoning survives past the people who were in the room.

---

*Prototype data — the Ellison family, the addresses, and every dollar figure — is fictional and exists only to make the screens legible. Do not seed production with it.*
