<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Codex / Cursor Instructions — ACTSTO.org

## Source of Truth

Before making changes, read these files:

```text
/AGENTS.md
/CLAUDE.md
/docs/ACTSTO_MASTER_PROMPT_2026-05-05.md
```

Use the master prompt as the main project brief.

---

## Project Goal

Finish and button up the ACTSTO.org webapp.

ACTSTO.org is a Christian school tuition scholarship / Arizona tax-credit donation platform.

The project includes:

- Public campaign pages
- Campaign creation
- Parents / guardians
- Students
- Individual donors
- Business donors
- Hybrid users
- PayPal Quick Donations
- PayPal Tax Credit Donations
- Supabase data
- Prisma models and migrations
- Campaign approvals
- Campaign backers
- Comments and reviews
- Tax receipts
- Donation allocations
- Scholarship recommendations
- Compliance records
- Super Admin dashboard
- WordPress API integration
- FluentCRM Pro integration
- FluentBoards Pro integration
- FluentBooking Pro integration

Do not rebuild the app from scratch. Improve and complete what already exists.

---

## Core Rules

1. Inspect before editing.
2. Do not edit files until the task asks for implementation.
3. Preserve existing working code.
4. Follow the current project structure and patterns.
5. Check the local Next.js docs before writing code because this Next.js version may differ from expected behavior.
6. Use TypeScript-safe code.
7. Use server-side validation for payments, webhooks, admin actions, user roles, and sensitive data.
8. Never expose secrets to the frontend.
9. Create migrations for schema changes.
10. Run available checks after changes.
11. Summarize changed files and blockers.

---

## Critical Security Rules

Never:

- Hardcode API keys.
- Expose the Supabase service role key.
- Expose PayPal secrets.
- Trust client-side PayPal success alone.
- Mark donations as paid without verified PayPal capture or verified webhook.
- Publish student campaign data without admin approval.
- Protect Super Admin pages only by hiding frontend links.
- Store private student, donor, tax, EIN, payment, receipt, or billing data in public-readable tables.
- Remove or bypass RLS.
- Ship open unmoderated comments involving students or families.

---

## First Task Behavior

When first asked to work on this project:

1. Read `/docs/ACTSTO_MASTER_PROMPT_2026-05-05.md`.
2. Inspect the repo.
3. Identify what exists.
4. Identify what is incomplete.
5. Identify what is missing.
6. Recommend what should be built first.
7. Provide a phased implementation plan.
8. Do not modify files until the plan is approved.

---

## Main Areas to Inspect

Inspect these areas:

```text
app
components
lib
prisma
supabase
scripts
middleware.ts
auth.ts
.env.example
package.json
next.config.ts
prisma.config.ts
```

Look specifically for:

- Auth flow
- User registration
- Hybrid User role setup
- Supabase clients
- Prisma schema
- Supabase migrations
- Campaign creation
- Campaign approval
- PayPal donation routes
- Webhooks
- Admin dashboard
- WordPress API integration
- FluentCRM integration
- FluentBoards integration
- FluentBooking integration
- Email/SMS integrations
- Environment variables
- RLS policies
- Storage buckets

---

## Supabase / Prisma Tables to Verify

Compare the current project to this expected structure:

```text
profiles
user_roles
account_setup_progress
parent_guardian_profiles
student_profiles
student_guardians
individual_donor_profiles
business_donor_profiles
schools
school_admins
campaigns
campaign_students
campaign_media
campaign_updates
campaign_faqs
giving_levels
donations
donation_details
donation_allocations
donor_billing_profiles
payment_events
campaign_backers
campaign_comments
campaign_reviews
donor_recommendations
scholarship_applications
scholarship_awards
scholarship_payments
tax_receipts
tax_credit_limits
compliance_checks
communication_preferences
email_logs
sms_logs
dashboard_notifications
approval_queue
admin_activity_logs
integration_logs
```

Do not blindly rename existing tables. Map, extend, or migrate safely.

---

## Required Relationship Model

Use this as the target relationship structure:

```text
auth.users
  -> profiles
  -> user_roles
  -> account_setup_progress
```

```text
profiles
  -> parent_guardian_profiles
  -> individual_donor_profiles
  -> business_donor_profiles
  -> student_profiles
```

```text
parent_guardian_profiles / profiles
  -> student_guardians
  -> student_profiles
  -> schools
```

```text
profiles
  -> campaigns
  -> campaign_students
  -> student_profiles
```

```text
campaigns
  -> campaign_media
  -> campaign_updates
  -> campaign_faqs
  -> giving_levels
  -> campaign_backers
  -> campaign_comments
  -> campaign_reviews
```

```text
profiles
  -> donations
  -> donation_details
  -> donation_allocations
  -> donor_recommendations
  -> tax_receipts
  -> payment_events
```

```text
student_profiles
  -> scholarship_applications
  -> scholarship_awards
  -> scholarship_payments
```

---

## Hybrid User Requirement

The app must support one login/email with multiple account types.

Supported user account types:

```text
parent
student
individual_donor
business_donor
```

Requirements:

- One Supabase Auth user
- One `profiles` record
- Multiple `user_roles` records
- Role-specific profile records
- Dashboard role switcher
- Account completion percentage per role
- Ability to add account types later
- No duplicate accounts for the same email
- Super Admin must not be publicly selectable

---

## PayPal Donation Requirements

The app must support two donation flows.

### Quick Donation

Must support:

- Campaign donation
- General donation
- Giving level
- Custom amount
- Anonymous donation
- Optional message
- Public display preferences
- PayPal checkout
- Server-side PayPal verification
- Webhook logging
- Campaign backer creation
- Campaign totals update
- Confirmation email

### Tax Credit Donation

Must support:

- Legal donor name
- Billing address
- Email
- Phone
- Tax year
- Filing status
- Arizona resident confirmation
- Tax-credit limit display
- Campaign / school / student recommendation
- Terms, privacy, and tax disclosure consent
- PayPal checkout
- Server-side PayPal verification
- Tax receipt generation
- Confirmation / receipt email

---

## Campaign Requirements

Verify or complete:

- Campaign draft saving
- Multi-step campaign creation
- Parent info
- Student info
- School selection
- Featured image upload
- Gallery upload
- Supabase Storage
- Campaign submission
- Admin review
- Approval / rejection
- Public campaign publishing
- Giving levels
- QR code
- Social sharing
- Backers
- Updates
- FAQ
- Comments moderation
- Reviews moderation

---

## Super Admin Requirements

Super Admin dashboard should support:

```text
Overview
Users
Campaigns
Donations
Backers
Comments
Reviews
Schools
Students
Scholarships
Compliance
Payments
Receipts
Content
Marketing
Integrations
Settings
Logs
```

Super Admin access must be verified server-side.

---

## WordPress / Fluent Requirements

Verify integrations with:

```text
https://arizonachristiantuition.com
```

Check:

- WordPress REST API
- FluentCRM Pro
- FluentBoards Pro
- FluentBooking Pro

Expected webhook/API routes:

```text
/api/webhooks/paypal
/api/webhooks/wordpress
/api/webhooks/fluentcrm
/api/webhooks/fluentboards
/api/webhooks/fluentbooking
```

Expected logging table:

```text
integration_logs
```

---

## Environment Variables to Verify

Verify `.env.example` includes safe placeholders for:

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

---

## Acceptance Criteria

Work is complete only when:

- Existing working functionality is preserved.
- Data is saved correctly.
- Schema changes include migrations.
- RLS/security impact is addressed.
- Sensitive operations are server-validated.
- PayPal is verified server-side.
- Webhooks are idempotent.
- Admin access is protected server-side.
- User-facing loading/error/success states exist.
- Available checks are run.
- Changed files and blockers are summarized.

---

## Suggested First Prompt

When the user asks for project review, use this task:

```text
Read AGENTS.md, CLAUDE.md, and /docs/ACTSTO_MASTER_PROMPT_2026-05-05.md.

Inspect the current codebase only. Do not edit files yet.

Identify what already exists, what is incomplete, what is missing, and what should be built first for Supabase, Prisma, user accounts, Hybrid User roles, PayPal donations, campaigns, Super Admin dashboard, tax receipts, WordPress/Fluent integrations, webhooks, environment variables, RLS, and security.

Then provide a phased implementation plan.
```