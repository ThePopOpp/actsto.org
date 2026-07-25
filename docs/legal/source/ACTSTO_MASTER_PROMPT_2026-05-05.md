# ACTSTO.ORG — Master Build Prompt for Claude Code / Codex
**Date:** May 5, 2026  
**Project:** ACTSTO.org / Arizona Christian Tuition  
**Primary Goal:** Button up loose ends, complete donations, user accounts, Supabase relationships, admin dashboard, and WordPress/Fluent integrations.

---

## 1. Master Instruction for Claude Code / Codex

You are working inside the `actsto.org` webapp project.

Your job is to review the existing codebase, compare it against the requirements in this document, and help complete the project in a clean, production-ready way.

This project is a Christian school tuition scholarship / Arizona tax-credit donation platform. It supports public fundraising campaigns, student scholarship campaigns, donors, parents/guardians, students, business donors, Super Admins, donation flows, PayPal checkout, Supabase data, WordPress integrations, FluentCRM, FluentBoards, FluentBooking, email/SMS notifications, tax receipts, and campaign management.

The goal is not to rebuild the whole app from scratch. The goal is to identify what already exists, preserve working code, complete missing pieces, clean up incomplete logic, connect Supabase correctly, verify API/webhook integrations, and make the webapp production-ready.

When making changes:

- Read the existing code first.
- Do not remove working features unless there is a clear reason.
- Use the existing design system, components, naming conventions, routes, and styling patterns where possible.
- Keep changes modular and easy to maintain.
- Prefer server-side validation for donation/payment/account logic.
- Protect all sensitive donor, student, school, tax, and payment data.
- Use Supabase Row Level Security where appropriate.
- Create or update migrations when database changes are required.
- Add clear comments only where they help future developers.
- Avoid overengineering, but do not skip compliance, payment, or security requirements.

---

## 2. Current Public Webapp Observations

The live ACTSTO.org website currently includes these visible features and flows:

### Homepage

The homepage presents ACT as a certified School Tuition Organization concept and promotes Arizona private school tax-credit giving. It includes:

- Hero message focused on turning Arizona taxes into private Christian education.
- Campaign cards with percent funded, amount raised, goal, donor count, days left, and amount remaining.
- Featured campaigns.
- New student campaigns.
- Browse by school type.
- “Gaining Momentum” / most active campaigns.
- Tax-credit explainer.
- 2026 tax-credit maximums.
- Role-based entry points for donors, parents, and schools.
- Footer links for campaigns, account portals, blog, legal, privacy policy, communication policy, terms, and tax-credit disclosure.

### Campaign Detail Pages

Campaign pages include:

- Campaign title.
- Campaign tagline.
- School name.
- Location.
- Campaign manager / parent.
- Student card.
- Student nickname.
- Grade level.
- School name.
- Individual student goal.
- Student-level progress.
- Story / opportunity section.
- Scholarship model explanation.
- Outcomes section.
- Gallery.
- Donation summary.
- Donor count.
- Days left.
- Quick donation button.
- Tax-credit donation messaging.
- Save/share actions.
- Giving levels.
- QR code.
- Social sharing.
- Tabs or sections for story updates, donors, and FAQ.

### Campaign Creation

The current Start Campaign flow is a multi-step flow:

1. Campaign
2. Parent Info
3. Student
4. School

The campaign step includes fields for:

- Campaign title
- Detailed description
- Short excerpt
- Tagline
- Campaign start date
- Campaign end date
- Financial goal
- Featured image URL
- Featured image upload
- Photo gallery URLs
- Gallery upload

### Donation Flow

The detailed tax-credit donation flow is a 4-step form:

1. Donors
2. Taxes
3. Billing
4. Review & Pay

The donor/billing section includes:

- First name
- Middle name
- Last name
- Billing address
- Unit / suite
- State
- City
- ZIP code
- Email
- Phone

### Registration

The public registration flow separates account types:

- Individual donor
- Business donor
- Parent / guardian
- Student

Student registration includes an age-gate concept:

- Students 16+ can register independently.
- Students under 16 require parent/guardian permission before campaign publishing.

---

## 3. Primary Completion Goals

Complete and verify the following core systems.

### Core Goal 1 — PayPal Donations

The webapp must support two donation paths:

#### A. Quick Donation

Fast, low-friction donation path.

Requirements:

- Allow donor to give quickly with minimal fields.
- Support campaign-specific donation.
- Support general ACT donation if no campaign is selected.
- Support giving level selection.
- Support custom amount.
- Support anonymous donation.
- Support optional public message.
- Support optional display preferences:
  - Show donor name publicly.
  - Hide donor name.
  - Show amount publicly.
  - Hide amount.
- Create a `donations` record with `payment_status = pending`.
- Start PayPal checkout.
- Listen for PayPal success/capture/webhook.
- Update donation to `paid` only after verified PayPal confirmation.
- Create campaign backer record when applicable.
- Update cached campaign totals after successful payment.
- Send confirmation email.
- Queue or generate tax receipt if applicable.

#### B. Tax Credit Donation

More detailed donation path for Arizona tax-credit donations.

Requirements:

- Use the existing 4-step flow:
  1. Donors
  2. Taxes
  3. Billing
  4. Review & Pay
- Collect donor legal name.
- Collect full billing address.
- Collect email and phone.
- Collect tax year.
- Collect filing status.
- Collect Arizona resident confirmation.
- Show current tax-credit limits based on `tax_credit_limits`.
- Allow campaign recommendation.
- Allow school recommendation.
- Allow student/campaign recommendation where compliant.
- Require tax-credit disclosure acknowledgement.
- Require terms/privacy acknowledgement.
- Create donation, donation details, billing profile, recommendation, and consent records.
- Start PayPal checkout.
- Verify PayPal capture server-side.
- Generate receipt record.
- Send receipt email.
- Log email event.

### Payment Safety Requirements

- Never trust client-side PayPal success alone.
- Use server-side PayPal order/capture verification.
- Store PayPal order IDs and capture IDs.
- Store PayPal webhook events in `payment_events`.
- Deduplicate webhook events by provider event ID.
- If webhook arrives before frontend callback, the webhook should still complete the donation.
- If frontend callback arrives before webhook, the callback can mark as paid only after server-side PayPal verification.
- Add retry-safe logic so duplicate events do not double-count donation totals.
- Never expose PayPal secret keys to the frontend.

---

## 4. User Types and Account Model

The app must support these user types:

1. Super Admin
2. Parent / Guardian
3. Student
4. Individual Donor
5. Business Donor
6. Hybrid User

### Super Admin

There should be three total Super Admins.

Super Admin users are not visible to regular users. They have complete control over the webapp and data.

Super Admins can:

- View all users.
- View all account types.
- View all campaigns.
- Approve/reject campaigns.
- View all donations.
- View payment status.
- View PayPal webhook/payment events.
- View tax receipts.
- View donor recommendations.
- View scholarship records.
- View schools.
- View students.
- View parents/guardians.
- Manage media uploads.
- Manage blog posts.
- Manage frontend CTAs/content blocks.
- Manage notifications.
- Manage email campaigns.
- Manage SMS/push notification settings.
- Manage API keys/settings.
- Review compliance records.
- Review admin activity logs.
- Trigger or review WordPress/Fluent sync status.

### Parent / Guardian

Parents can:

- Create and manage their own profile.
- Add one or more students.
- Start campaign(s) for student(s).
- Manage campaign drafts.
- Submit campaigns for review.
- View campaign donations/backers.
- View campaign progress.
- Receive notifications.
- Access scholarship/application-related records where permitted.

### Student

Students can:

- Create or manage their student profile if eligible.
- For age 16+, register independently.
- For under 16, require parent/guardian approval.
- View campaigns connected to their profile.
- View funding progress.
- Submit profile details only where permitted.

### Individual Donor

Individual donors can:

- Create a donor profile.
- Make quick donations.
- Make tax-credit donations.
- View donation history.
- View receipts.
- Save billing profile.
- Save favorite campaigns.
- Manage communication preferences.

### Business Donor

Business donors can:

- Create a business profile.
- Add business name, contact details, EIN if needed, business address, and organization type.
- Make business/corporate donations.
- View business donation history.
- View receipts.
- Manage business display name and public giving visibility.
- Save billing profile.

### Hybrid User

A Hybrid User is one login/email account that can access one or more account types.

This is a core missing or incomplete feature and needs to be finished.

A user should be able to have any combination of:

- Parent / Guardian
- Student
- Individual Donor
- Business Donor

The Hybrid User setup should:

- Use one Supabase Auth user.
- Use one `profiles` row.
- Use `user_roles` to assign account capabilities.
- Let users switch active role/profile context from the dashboard.
- Allow account setup progress tracking per account type.
- Allow a user to complete one profile now and another later.
- Show completion percentage per role:
  - Parent profile completion
  - Student profile completion
  - Individual donor profile completion
  - Business donor profile completion
- Prevent duplicate accounts from being created for the same email.
- Allow role additions after signup.
- Let Super Admins see all roles connected to a user.

Example:

A user signs up as an Individual Donor, then later starts a campaign for their child. The system should let that user add the Parent role without creating a second login.

Another user might be a Parent, Individual Donor, and Business Donor under the same email.

---

## 5. Supabase Database Design

Use Supabase Auth for authentication. Extend Supabase Auth with app-specific profile and role tables.

### 5.1 Core Auth Tables

#### `profiles`

Purpose: Main app profile connected to `auth.users`.

Fields:

```sql
id uuid primary key references auth.users(id) on delete cascade,
first_name text,
middle_name text,
last_name text,
display_name text,
email text not null,
phone text,
avatar_url text,
primary_account_type text,
active_account_type text,
status text default 'active',
is_super_admin boolean default false,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Notes:

- `id` must match Supabase Auth user ID.
- `primary_account_type` is the original selected type.
- `active_account_type` is the currently selected dashboard context.
- Super Admins should be controlled through roles and/or a secure admin allowlist, not only a frontend flag.

#### `user_roles`

Purpose: Allows one user to have multiple account types.

Fields:

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid references profiles(id) on delete cascade,
role text not null,
status text default 'active',
completion_percent integer default 0,
is_complete boolean default false,
created_at timestamptz default now(),
updated_at timestamptz default now(),
unique(user_id, role)
```

Allowed roles:

```text
super_admin
parent
student
individual_donor
business_donor
school_admin
```

#### `account_setup_progress`

Purpose: Tracks profile completion by role.

Fields:

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid references profiles(id) on delete cascade,
role text not null,
required_fields jsonb default '[]'::jsonb,
completed_fields jsonb default '[]'::jsonb,
missing_fields jsonb default '[]'::jsonb,
completion_percent integer default 0,
last_checked_at timestamptz,
created_at timestamptz default now(),
updated_at timestamptz default now(),
unique(user_id, role)
```

Use this for the Hybrid User dashboard progress indicators.

---

## 6. Role-Specific Profile Tables

### `parent_guardian_profiles`

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid references profiles(id) on delete cascade,
relationship_to_student text,
address_line_1 text,
address_line_2 text,
city text,
state text,
zip text,
emergency_contact_name text,
emergency_contact_phone text,
profile_status text default 'incomplete',
created_at timestamptz default now(),
updated_at timestamptz default now(),
unique(user_id)
```

### `student_profiles`

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid references profiles(id) on delete set null,
first_name text not null,
last_name text not null,
nickname text,
date_of_birth date,
age_verified boolean default false,
grade_level text,
school_id uuid references schools(id),
profile_photo_url text,
bio text,
created_by uuid references profiles(id),
status text default 'pending',
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Notes:

- `user_id` can be null when a parent creates a student who does not have login access.
- `created_by` should track parent/admin creator.
- Sensitive student data must be protected with RLS.

### `student_guardians`

```sql
id uuid primary key default gen_random_uuid(),
student_id uuid references student_profiles(id) on delete cascade,
guardian_user_id uuid references profiles(id) on delete cascade,
relationship text,
is_primary boolean default false,
permission_status text default 'pending',
created_at timestamptz default now(),
updated_at timestamptz default now(),
unique(student_id, guardian_user_id)
```

### `individual_donor_profiles`

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid references profiles(id) on delete cascade,
filing_status text,
az_resident boolean,
default_tax_year integer,
annual_limit numeric,
profile_status text default 'incomplete',
created_at timestamptz default now(),
updated_at timestamptz default now(),
unique(user_id)
```

### `business_donor_profiles`

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid references profiles(id) on delete cascade,
business_name text,
business_title text,
ein text,
business_email text,
business_phone text,
business_type text,
address_line_1 text,
address_line_2 text,
city text,
state text,
zip text,
profile_status text default 'incomplete',
created_at timestamptz default now(),
updated_at timestamptz default now(),
unique(user_id)
```

Security note:

- EIN should not be publicly readable.
- Consider encrypting or masking EIN.
- Only Super Admins and the owning user should access this data.

---

## 7. Schools and Campaigns

### `schools`

```sql
id uuid primary key default gen_random_uuid(),
name text not null,
slug text unique,
school_type text,
description text,
logo_url text,
website_url text,
phone text,
email text,
address_line_1 text,
address_line_2 text,
city text,
state text,
zip text,
county text,
is_partner boolean default false,
status text default 'pending',
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `school_admins`

```sql
id uuid primary key default gen_random_uuid(),
school_id uuid references schools(id) on delete cascade,
user_id uuid references profiles(id) on delete cascade,
role text default 'viewer',
created_at timestamptz default now(),
unique(school_id, user_id)
```

### `campaigns`

```sql
id uuid primary key default gen_random_uuid(),
owner_user_id uuid references profiles(id),
school_id uuid references schools(id),
title text not null,
slug text unique not null,
tagline text,
short_excerpt text,
description text,
campaign_type text default 'family',
status text default 'draft',
start_date date,
end_date date,
financial_goal numeric not null default 0,
amount_raised numeric not null default 0,
donor_count integer not null default 0,
featured_image_url text,
qr_code_url text,
city text,
state text,
is_featured boolean default false,
is_public boolean default true,
submitted_at timestamptz,
approved_by uuid references profiles(id),
approved_at timestamptz,
rejected_by uuid references profiles(id),
rejected_at timestamptz,
rejection_reason text,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Campaign statuses:

```text
draft
pending_review
active
paused
completed
rejected
archived
```

### `campaign_students`

Purpose: supports one campaign with one or more students.

```sql
id uuid primary key default gen_random_uuid(),
campaign_id uuid references campaigns(id) on delete cascade,
student_id uuid references student_profiles(id) on delete cascade,
individual_goal numeric default 0,
amount_allocated numeric default 0,
sort_order integer default 0,
created_at timestamptz default now(),
updated_at timestamptz default now(),
unique(campaign_id, student_id)
```

### `campaign_media`

```sql
id uuid primary key default gen_random_uuid(),
campaign_id uuid references campaigns(id) on delete cascade,
media_type text not null,
file_url text,
storage_path text,
alt_text text,
caption text,
sort_order integer default 0,
uploaded_by uuid references profiles(id),
created_at timestamptz default now()
```

Allowed media types:

```text
featured_image
gallery_image
video
document
```

### `campaign_updates`

```sql
id uuid primary key default gen_random_uuid(),
campaign_id uuid references campaigns(id) on delete cascade,
author_user_id uuid references profiles(id),
title text,
body text not null,
status text default 'draft',
published_at timestamptz,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `campaign_faqs`

```sql
id uuid primary key default gen_random_uuid(),
campaign_id uuid references campaigns(id) on delete cascade,
question text not null,
answer text not null,
sort_order integer default 0,
is_public boolean default true,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `giving_levels`

```sql
id uuid primary key default gen_random_uuid(),
campaign_id uuid references campaigns(id) on delete cascade,
title text not null,
amount numeric not null,
description text,
spots_available integer,
spots_claimed integer default 0,
sort_order integer default 0,
is_active boolean default true,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

---

## 8. Donations, PayPal, Backers, Reviews, and Comments

### `donations`

Primary private financial transaction record.

```sql
id uuid primary key default gen_random_uuid(),
donor_user_id uuid references profiles(id),
campaign_id uuid references campaigns(id),
school_id uuid references schools(id),
amount numeric not null,
tip_amount numeric default 0,
processing_fee_amount numeric default 0,
total_amount numeric not null,
currency text default 'USD',
donation_type text not null,
payment_status text default 'pending',
payment_provider text default 'paypal',
payment_provider_order_id text,
payment_provider_capture_id text,
anonymous boolean default false,
donor_message text,
tax_year integer,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Donation types:

```text
quick
tax_credit
business
general
campaign
manual_check
```

Payment statuses:

```text
pending
paid
failed
cancelled
refunded
partially_refunded
```

### `donation_details`

Stores donor-entered detail data separate from the core transaction row.

```sql
id uuid primary key default gen_random_uuid(),
donation_id uuid references donations(id) on delete cascade,

donor_first_name text,
donor_middle_name text,
donor_last_name text,
donor_email text,
donor_phone text,

billing_address_line_1 text,
billing_address_line_2 text,
billing_city text,
billing_state text,
billing_zip text,

tax_year integer,
filing_status text,
is_arizona_resident boolean,
wants_tax_receipt boolean default true,

dedication_type text,
dedication_name text,
dedication_message text,

public_display_name text,
public_message text,
show_name_publicly boolean default true,
show_amount_publicly boolean default false,

metadata jsonb default '{}'::jsonb,

created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `donation_allocations`

Tracks how a donation is allocated across campaign, school, student, or general fund.

```sql
id uuid primary key default gen_random_uuid(),
donation_id uuid references donations(id) on delete cascade,
campaign_id uuid references campaigns(id),
student_id uuid references student_profiles(id),
school_id uuid references schools(id),
amount numeric not null,
allocation_type text not null,
created_at timestamptz default now()
```

Allocation types:

```text
campaign
student
school
general_fund
```

### `donor_billing_profiles`

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid references profiles(id) on delete cascade,
first_name text,
middle_name text,
last_name text,
email text,
phone text,
address_line_1 text,
address_line_2 text,
city text,
state text,
zip text,
is_default boolean default false,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `payment_events`

Raw PayPal/webhook event log.

```sql
id uuid primary key default gen_random_uuid(),
provider text not null,
event_type text not null,
provider_event_id text unique,
provider_order_id text,
provider_capture_id text,
donation_id uuid references donations(id),
payload jsonb not null,
processed boolean default false,
processed_at timestamptz,
created_at timestamptz default now()
```

### `campaign_backers`

Public-facing supporter/backer record.

```sql
id uuid primary key default gen_random_uuid(),
campaign_id uuid references campaigns(id) on delete cascade,
donation_id uuid references donations(id) on delete set null,
user_id uuid references profiles(id) on delete set null,

display_name text,
avatar_url text,
amount numeric,
message text,

is_anonymous boolean default false,
show_amount boolean default false,
show_message boolean default true,

backer_type text,
giving_level_id uuid references giving_levels(id),

status text default 'pending_review',
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Backer statuses:

```text
pending_review
visible
hidden
removed
```

### `campaign_comments`

Moderated campaign comments.

```sql
id uuid primary key default gen_random_uuid(),
campaign_id uuid references campaigns(id) on delete cascade,
user_id uuid references profiles(id) on delete set null,
parent_comment_id uuid references campaign_comments(id) on delete cascade,

author_name text,
author_email text,
comment_body text not null,

comment_type text default 'encouragement',
status text default 'pending',

is_pinned boolean default false,
is_private boolean default false,

moderated_by uuid references profiles(id),
moderated_at timestamptz,

created_at timestamptz default now(),
updated_at timestamptz default now()
```

Comments must be moderated by default because campaigns involve students and families.

### `campaign_reviews`

Testimonials/reviews separate from comments.

```sql
id uuid primary key default gen_random_uuid(),
campaign_id uuid references campaigns(id) on delete cascade,
user_id uuid references profiles(id) on delete set null,

rating integer check (rating >= 1 and rating <= 5),
review_title text,
review_body text,

reviewer_name text,
reviewer_type text,

status text default 'pending',
is_featured boolean default false,
is_verified_donor boolean default false,

moderated_by uuid references profiles(id),
moderated_at timestamptz,

created_at timestamptz default now(),
updated_at timestamptz default now()
```

---

## 9. Scholarship, Recommendations, Tax Receipts, and Compliance

### `donor_recommendations`

Tracks donor recommendations without confusing them with actual scholarship awards.

```sql
id uuid primary key default gen_random_uuid(),
donation_id uuid references donations(id) on delete cascade,
recommended_student_id uuid references student_profiles(id),
recommended_school_id uuid references schools(id),
recommended_campaign_id uuid references campaigns(id),
relationship_disclosure text,
is_dependent_of_donor boolean,
compliance_status text default 'pending',
reviewed_by uuid references profiles(id),
reviewed_at timestamptz,
created_at timestamptz default now()
```

### `scholarship_applications`

```sql
id uuid primary key default gen_random_uuid(),
student_id uuid references student_profiles(id),
guardian_user_id uuid references profiles(id),
school_id uuid references schools(id),
school_year text,
requested_amount numeric,
household_income_range text,
application_status text default 'draft',
submitted_at timestamptz,
reviewed_by uuid references profiles(id),
reviewed_at timestamptz,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `scholarship_awards`

```sql
id uuid primary key default gen_random_uuid(),
application_id uuid references scholarship_applications(id),
student_id uuid references student_profiles(id),
school_id uuid references schools(id),
campaign_id uuid references campaigns(id),
award_amount numeric not null,
award_date date,
school_year text,
status text default 'pending',
approved_by uuid references profiles(id),
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `scholarship_payments`

```sql
id uuid primary key default gen_random_uuid(),
award_id uuid references scholarship_awards(id),
school_id uuid references schools(id),
amount numeric not null,
payment_method text,
payment_reference text,
paid_at timestamptz,
status text default 'pending',
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### `tax_receipts`

```sql
id uuid primary key default gen_random_uuid(),
donation_id uuid references donations(id) on delete cascade,
receipt_number text unique not null,
tax_year integer,
receipt_pdf_url text,
issued_to_name text,
issued_to_email text,
amount numeric,
issued_at timestamptz,
emailed_at timestamptz,
status text default 'generated',
created_at timestamptz default now()
```

### `tax_credit_limits`

```sql
id uuid primary key default gen_random_uuid(),
tax_year integer not null,
filing_status text not null,
original_credit_limit numeric,
overflow_credit_limit numeric,
combined_limit numeric,
effective_start_date date,
effective_end_date date,
source_url text,
notes text,
created_at timestamptz default now(),
updated_at timestamptz default now(),
unique(tax_year, filing_status)
```

### `compliance_checks`

```sql
id uuid primary key default gen_random_uuid(),
entity_type text not null,
entity_id uuid not null,
check_type text not null,
status text not null,
notes text,
reviewed_by uuid references profiles(id),
created_at timestamptz default now()
```

---

## 10. Super Admin Dashboard Requirements

Build or complete a secure Super Admin dashboard.

The dashboard should only be accessible to the three approved Super Admin users.

### Super Admin Dashboard Sections

#### Overview

- Total donations.
- Donations this month.
- Pending donations.
- Failed donations.
- Active campaigns.
- Pending campaigns.
- Pending users.
- Pending student approvals.
- Pending scholarship recommendations.
- Pending compliance checks.
- PayPal status.
- WordPress/Fluent sync status.

#### Users

- View all users.
- Filter by role.
- View hybrid role combinations.
- View profile completion percentages.
- Add/remove roles.
- Suspend/reactivate users.
- View account setup progress.

#### Campaigns

- View all campaigns.
- Filter by status.
- Approve/reject campaigns.
- Edit campaign metadata.
- View campaign students.
- View media uploads.
- View giving levels.
- View backers.
- Moderate comments/reviews.
- Feature/unfeature campaigns.

#### Donations

- View all donations.
- Filter by quick/tax-credit/business/general.
- Filter by paid/pending/failed/refunded.
- View PayPal order/capture IDs.
- View payment events.
- View donation allocations.
- View donor recommendation.
- Generate/regenerate receipt.
- Resend receipt email.

#### Schools

- View all schools.
- Add/edit school.
- Approve partner schools.
- Assign school admins.

#### Students

- View students.
- View guardian relationships.
- Verify age/parent permission status.
- View campaign associations.
- Protect sensitive data.

#### Compliance

- View donor recommendations.
- View dependent relationship flags.
- View tax-credit disclosure acknowledgements.
- View scholarship applications.
- View awards/payments.
- Add internal notes.

#### Content / Frontend

- Manage homepage CTA text.
- Manage campaign sections.
- Manage tax-credit max display.
- Manage FAQ.
- Manage blog posts.
- Manage legal page content.
- Manage notification banners.

#### Marketing / Communications

- View email logs.
- View SMS logs.
- Manage notification templates.
- Trigger campaign update emails.
- Trigger donor thank-you emails.
- Trigger admin alerts.
- Review bounced/failed emails.
- Manage opt-ins/preferences.

#### API / Integrations

- PayPal status.
- Supabase status.
- WordPress API status.
- FluentCRM webhook status.
- FluentBoards webhook status.
- FluentBooking webhook status.
- Resend status.
- Twilio status, if configured.
- Last successful sync timestamps.
- Failed webhook logs.

---

## 11. WordPress / Fluent Integration Review

The app is connected to the WordPress website:

```text
https://arizonachristiantuition.com
```

Claude Code / Codex should verify the following.

### WordPress REST API

Tasks:

- Find existing WordPress API client code.
- Find environment variables for WordPress base URL and credentials.
- Verify API calls are successful.
- Confirm authentication method.
- Confirm data sync direction:
  - Webapp to WordPress
  - WordPress to webapp
  - Both
- Add health-check endpoint or admin status card.
- Add error logging for failed WordPress API calls.
- Do not expose WordPress API credentials in frontend code.

### FluentCRM Pro

Purpose:

- Marketing.
- Email automation.
- Contact management.
- Contact fields/meta data.
- Segmentation.
- Triggering automations.

Tasks:

- Verify existing FluentCRM API integration.
- Verify contact creation/update from webapp registration.
- Verify donor contact metadata sync.
- Verify parent/student/business donor metadata sync.
- Verify donation metadata sync.
- Verify tags/lists are applied correctly.
- Verify automations trigger from correct events.
- Add sync status/error logs.

Recommended events to sync:

```text
user_registered
role_added
campaign_created
campaign_submitted
campaign_approved
donation_paid
tax_receipt_generated
parent_added_student
business_donor_registered
```

Recommended metadata:

```text
act_user_id
act_account_roles
act_active_account_type
act_profile_completion
act_total_donated
act_last_donation_date
act_campaign_count
act_parent_status
act_student_status
act_business_name
act_tax_year
```

### FluentBoards Pro

Purpose:

- Project management.
- Internal tasks.
- Campaign review workflow.
- Project updates.
- Triggering automations.

Tasks:

- Verify webhook connection.
- Verify API credentials.
- Confirm if campaign submission creates a FluentBoards task/card.
- Confirm if campaign approval/rejection updates task/card.
- Confirm internal admin notes or project statuses sync.
- Add retry/error logging.

Recommended FluentBoards triggers:

```text
new_campaign_pending_review
new_school_pending_approval
new_scholarship_application
failed_payment_needs_review
compliance_check_failed
new_business_donor_registered
```

### FluentBooking Pro

Purpose:

- Appointments.
- Calendar sync.
- Consultation scheduling.
- Email automation.

Tasks:

- Verify webhook connection.
- Verify booking data can be received.
- Verify booked appointments can attach to ACT user profile.
- Verify FluentBooking automations trigger correctly.
- Confirm calendar sync works.
- Add admin integration status.

Recommended sync data:

```text
booking_id
booking_status
booking_date
booking_time
booking_timezone
contact_email
contact_phone
user_id
account_type
campaign_id
appointment_type
```

---

## 12. Notification and Communication System

Add or verify the following tables.

### `communication_preferences`

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid references profiles(id) on delete cascade,
email_opt_in boolean default true,
sms_opt_in boolean default false,
transactional_email_enabled boolean default true,
marketing_email_enabled boolean default false,
donation_updates_enabled boolean default true,
campaign_updates_enabled boolean default true,
created_at timestamptz default now(),
updated_at timestamptz default now(),
unique(user_id)
```

### `email_logs`

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid references profiles(id),
to_email text,
subject text,
template_key text,
provider text,
provider_message_id text,
status text,
payload jsonb,
sent_at timestamptz,
created_at timestamptz default now()
```

### `sms_logs`

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid references profiles(id),
to_phone text,
message text,
provider text default 'twilio',
provider_message_id text,
status text,
created_at timestamptz default now()
```

### `dashboard_notifications`

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid references profiles(id) on delete cascade,
title text not null,
message text,
notification_type text,
read_at timestamptz,
action_url text,
created_at timestamptz default now()
```

---

## 13. Admin Approvals and Activity Logs

### `approval_queue`

```sql
id uuid primary key default gen_random_uuid(),
entity_type text not null,
entity_id uuid not null,
submitted_by uuid references profiles(id),
status text default 'pending',
review_notes text,
reviewed_by uuid references profiles(id),
reviewed_at timestamptz,
created_at timestamptz default now()
```

Entity types:

```text
campaign
school
student
scholarship_application
business_donor
comment
review
```

### `admin_activity_logs`

```sql
id uuid primary key default gen_random_uuid(),
admin_user_id uuid references profiles(id),
action text not null,
entity_type text,
entity_id uuid,
before_data jsonb,
after_data jsonb,
created_at timestamptz default now()
```

---

## 14. Supabase Relationship Map

Use this as the core relationship reference.

```text
auth.users
   ↓
profiles
   ↓
user_roles
   ↓
account_setup_progress
```

```text
profiles
   ├── parent_guardian_profiles
   ├── individual_donor_profiles
   ├── business_donor_profiles
   └── student_profiles
```

```text
parent_guardian_profiles / profiles
   ↓
student_guardians
   ↓
student_profiles
   ↓
schools
```

```text
profiles
   ↓
campaigns
   ↓
campaign_students
   ↓
student_profiles
```

```text
campaigns
   ├── campaign_media
   ├── campaign_updates
   ├── campaign_faqs
   ├── giving_levels
   ├── campaign_comments
   ├── campaign_reviews
   └── campaign_backers
```

```text
profiles
   ↓
donations
   ├── donation_details
   ├── donation_allocations
   ├── donor_recommendations
   ├── tax_receipts
   └── payment_events
```

```text
donations
   ↓
donation_allocations
   ├── campaigns
   ├── student_profiles
   ├── schools
   └── general_fund
```

```text
student_profiles
   ↓
scholarship_applications
   ↓
scholarship_awards
   ↓
scholarship_payments
   ↓
schools
```

```text
profiles
   ├── communication_preferences
   ├── dashboard_notifications
   ├── email_logs
   └── sms_logs
```

```text
Super Admin
   ├── approval_queue
   ├── admin_activity_logs
   ├── compliance_checks
   ├── payment_events
   ├── WordPress sync logs
   ├── FluentCRM sync logs
   ├── FluentBoards sync logs
   └── FluentBooking sync logs
```

---

## 15. Recommended Supabase Storage Buckets

Create or verify these buckets:

```text
campaign-featured-images
campaign-galleries
student-photos
school-logos
receipts
documents
blog-images
profile-avatars
```

Storage requirements:

- Public campaign images can be public.
- Student photos should be carefully permissioned.
- Receipts should not be public.
- Documents should not be public.
- Use signed URLs for private files.
- Store `storage_path` in the database, not only public URLs.

---

## 16. Row Level Security Requirements

Implement RLS early.

### Public Visitors Can Read

- Active public campaigns.
- Approved campaign media.
- Approved giving levels.
- Approved visible campaign backers.
- Approved visible campaign reviews.
- Approved public campaign FAQs/updates.
- Public school records marked active.

### Users Can Read/Write Their Own

- Own profile.
- Own account setup progress.
- Own role-specific profiles.
- Own donations.
- Own tax receipts.
- Own billing profiles.
- Own communication preferences.
- Own notifications.
- Own students only if guardian relationship exists.
- Own campaigns only if owner/guardian/student relationship exists.

### Parents Can Manage

- Students connected through `student_guardians`.
- Campaigns they own.
- Campaign students for campaigns they own.
- Campaign media for campaigns they own before/after approval, depending on status rules.

### School Admins Can Read

- Their school.
- Students/campaigns linked to their school, limited to allowed fields.
- School-related donation/award reports where permitted.

### Super Admins Can Access

- Everything, through secure policies.
- Admin access should be checked server-side and not only hidden in the UI.

---

## 17. Required App Routes / Pages to Verify

Verify these routes exist or create them if missing.

### Public

```text
/
 /campaigns
 /campaigns/[slug]
 /campaigns/new
 /donate
 /donate/quick
 /donate/detailed
 /register
 /register/donor
 /register/business
 /register/parent
 /register/student
 /login
 /about
 /faq
 /contact
 /legal
 /privacy-policy
 /communication-policy
 /terms
 /tax-credit-disclosure
```

### Dashboard

```text
/dashboard
/dashboard/profile
/dashboard/switch-role
/dashboard/parent
/dashboard/parent/students
/dashboard/parent/campaigns
/dashboard/student
/dashboard/donor
/dashboard/donor/donations
/dashboard/donor/receipts
/dashboard/business
/dashboard/business/donations
/dashboard/settings
```

### Super Admin

```text
/admin
/admin/users
/admin/campaigns
/admin/donations
/admin/backers
/admin/comments
/admin/reviews
/admin/schools
/admin/students
/admin/scholarships
/admin/compliance
/admin/payments
/admin/receipts
/admin/content
/admin/marketing
/admin/integrations
/admin/settings
/admin/logs
```

---

## 18. Environment Variables to Verify

Find and verify existing environment variables. Add missing examples to `.env.example`.

Recommended variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_WEBHOOK_ID=

WORDPRESS_BASE_URL=https://arizonachristiantuition.com
WORDPRESS_API_USERNAME=
WORDPRESS_API_PASSWORD=

FLUENTCRM_API_KEY=
FLUENTCRM_API_SECRET=
FLUENTCRM_BASE_URL=

FLUENTBOARDS_API_KEY=
FLUENTBOARDS_API_SECRET=
FLUENTBOARDS_BASE_URL=
FLUENTBOARDS_WEBHOOK_SECRET=

FLUENTBOOKING_API_KEY=
FLUENTBOOKING_API_SECRET=
FLUENTBOOKING_BASE_URL=
FLUENTBOOKING_WEBHOOK_SECRET=

RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_FROM_NAME=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

APP_URL=https://actsto.org
ADMIN_EMAIL=
```

Security:

- Never expose service role, PayPal secret, WordPress credentials, Fluent API keys, Resend key, or Twilio token to the frontend.
- Only expose variables prefixed with `NEXT_PUBLIC_` if safe.

---

## 19. Webhook Endpoints to Verify or Add

### PayPal

```text
/api/webhooks/paypal
```

Responsibilities:

- Verify webhook signature.
- Store event in `payment_events`.
- Match event to donation by order/capture ID.
- Update donation status.
- Create backer if paid.
- Generate receipt if needed.
- Trigger email confirmation.
- Update campaign totals safely.

### WordPress / FluentCRM / FluentBoards / FluentBooking

Recommended endpoints:

```text
/api/webhooks/wordpress
/api/webhooks/fluentcrm
/api/webhooks/fluentboards
/api/webhooks/fluentbooking
```

Responsibilities:

- Verify secret/signature.
- Store raw event.
- Process supported event types.
- Add sync logs.
- Update related Supabase records.
- Never fail silently.

---

## 20. Data Sync / Integration Logs

Add a generic table if one does not exist.

### `integration_logs`

```sql
id uuid primary key default gen_random_uuid(),
integration_name text not null,
event_type text,
direction text,
status text,
entity_type text,
entity_id uuid,
request_payload jsonb,
response_payload jsonb,
error_message text,
processed_at timestamptz,
created_at timestamptz default now()
```

Integration names:

```text
wordpress
fluentcrm
fluentboards
fluentbooking
paypal
resend
twilio
supabase
```

Directions:

```text
inbound
outbound
manual_check
```

---

## 21. Calculations and Views

Create SQL views or helper functions for reporting and UI.

### `campaign_summary_view`

Should include:

```text
campaign_id
title
slug
status
financial_goal
amount_raised
donor_count
percent_funded
days_left
amount_remaining
school_name
student_count
featured_image_url
is_featured
```

### `donor_summary_view`

Should include:

```text
donor_user_id
total_donated
donation_count
last_donation_date
tax_year
receipt_count
```

### `student_funding_summary_view`

Should include:

```text
student_id
student_name
school_name
campaign_count
individual_goal
amount_allocated
percent_funded
```

### `admin_dashboard_summary_view`

Should include:

```text
total_donations
paid_donations
pending_donations
failed_donations
active_campaigns
pending_campaigns
pending_comments
pending_reviews
pending_compliance_checks
pending_receipts
```

---

## 22. Frontend UX Items to Button Up

Review and complete the following.

### Donation UX

- Add clear Quick Donation vs Tax Credit Donation choice.
- Make Quick Donation truly fast.
- Make Tax Credit Donation more detailed and compliant.
- Show selected campaign/student/school.
- Show donation summary before PayPal.
- Confirm donation after PayPal capture.
- Show receipt status.
- Handle cancelled payment.
- Handle failed payment.
- Handle duplicate click protection.
- Add loading states.
- Add error states.

### Account UX

- Finish Hybrid User account type selector.
- Add dashboard role switcher.
- Add account completion meters.
- Add “Complete Setup” call-to-action per role.
- Prevent duplicate user accounts with same email.
- Let users add another account type after signup.

### Campaign UX

- Ensure campaign creation saves drafts.
- Ensure parent/student/school steps persist.
- Ensure image uploads go to Supabase Storage.
- Ensure campaigns require admin approval before public publishing.
- Add pending review state.
- Add rejected/needs changes state.
- Add campaign preview before submission.
- Add giving levels.
- Add QR code generation.
- Add social sharing.

### Admin UX

- Add admin dashboard.
- Add review queues.
- Add filters/search.
- Add donation/payment logs.
- Add integration health checks.
- Add activity logs.
- Add safe admin-only routes.

### Comments / Reviews / Backers

- Backers should be generated from successful donations.
- Comments should be moderated by default.
- Reviews should be moderated by default.
- Reviews should support verified donor flag.
- Admins should be able to approve/hide/remove comments and reviews.

---

## 23. Acceptance Criteria

The project is considered buttoned up when the following are true.

### Donations

- Quick Donation works end-to-end with PayPal.
- Tax Credit Donation works end-to-end with PayPal.
- Donation records are created correctly.
- PayPal webhooks are verified and logged.
- Paid donations update campaign totals.
- Tax receipts are generated or queued.
- Donors receive confirmation emails.
- Failed/cancelled payments do not update campaign totals.

### User Accounts

- Users can register as Individual Donor, Business Donor, Parent, or Student.
- Hybrid User can hold multiple account types.
- One email can access multiple roles.
- Dashboard role switching works.
- Account completion percentages work.
- Super Admins can view and manage users/roles.

### Campaigns

- Parents can create campaign drafts.
- Students can be added.
- Schools can be attached.
- Media uploads work.
- Campaigns can be submitted for review.
- Super Admin can approve/reject.
- Approved campaigns become public.
- Public campaign pages show correct funding data.

### Admin

- Only Super Admins access `/admin`.
- Super Admin can review campaigns, users, donations, schools, students, backers, comments, reviews, compliance, and integrations.
- Admin actions are logged.

### WordPress / Fluent

- WordPress API connection is verified.
- FluentCRM sync is verified.
- FluentBoards webhook is verified.
- FluentBooking webhook is verified.
- Integration logs exist.
- Admin dashboard shows health/status of integrations.

### Security

- Supabase RLS is enabled.
- Private donor/student/payment/receipt data is protected.
- API secrets are server-only.
- Webhooks are verified.
- Admin routes are server-protected.
- Student data is not exposed publicly beyond approved campaign display fields.

---

## 24. Claude Code / Codex Work Plan

Follow this order.

### Step 1 — Inspect

- Review current project structure.
- Identify framework and routing approach.
- Find Supabase client/server files.
- Find existing database schema/migrations.
- Find existing auth logic.
- Find donation/PayPal files.
- Find WordPress/Fluent integration files.
- Find dashboard/admin routes.
- Report what exists and what is missing.

### Step 2 — Database

- Compare existing Supabase schema to this document.
- Add missing migrations.
- Add RLS policies.
- Add database views.
- Add storage buckets if managed in code.
- Add seed data only where appropriate.

### Step 3 — Auth / Hybrid User

- Complete `profiles`.
- Complete `user_roles`.
- Complete account setup progress.
- Complete role switcher.
- Complete account type registration and role addition.

### Step 4 — Donations / PayPal

- Complete Quick Donation.
- Complete Tax Credit Donation.
- Add server-side PayPal order/capture.
- Add PayPal webhook.
- Add donation details.
- Add payment events.
- Add receipts.
- Add backer generation.
- Add campaign total update logic.

### Step 5 — Campaigns

- Complete campaign creation wizard.
- Add Supabase Storage uploads.
- Add parent/student/school relationships.
- Add approval workflow.
- Add campaign public page data from Supabase.
- Add giving levels.
- Add QR/share support.

### Step 6 — Super Admin

- Build/complete secure admin dashboard.
- Add users/campaigns/donations/payments/schools/students/compliance/integrations sections.
- Add moderation for comments/reviews.
- Add integration health cards.
- Add logs.

### Step 7 — WordPress / Fluent

- Verify WordPress REST API.
- Verify FluentCRM API.
- Verify FluentBoards webhook.
- Verify FluentBooking webhook.
- Add integration logs.
- Add admin test buttons/status checks if appropriate.

### Step 8 — QA

- Test all role registrations.
- Test Hybrid User role switching.
- Test Quick Donation.
- Test Tax Credit Donation.
- Test PayPal sandbox.
- Test webhook processing.
- Test campaign approval.
- Test RLS access.
- Test admin restrictions.
- Test WordPress/Fluent integrations.
- Fix bugs and edge cases.

---

## 25. Important Final Notes

This app handles sensitive financial, student, family, and tax-credit information. Treat it like a production donation/compliance platform.

Prioritize:

1. Secure payments.
2. Correct Supabase relationships.
3. Hybrid User account structure.
4. Super Admin visibility/control.
5. Campaign approval workflow.
6. Tax receipt and compliance tracking.
7. WordPress/Fluent integration verification.
8. Clean UX and error handling.

Do not ship donation logic until PayPal server-side verification and webhook handling are complete.

Do not ship student/campaign publishing until admin approval and RLS protections are complete.

Do not ship Super Admin tools unless admin access is protected server-side.
