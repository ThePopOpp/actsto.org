# Claude Code Project Memory — ACTSTO.org

## Read This First

This project has a detailed source-of-truth document here:

```text
/docs/ACTSTO_MASTER_PROMPT_2026-05-05.md
```

Before making architectural or implementation decisions, read that document and use it as the primary reference.

This file gives Claude Code the project context, priorities, constraints, and working style.

---

## Project Summary

ACTSTO.org is a Christian school tuition scholarship / Arizona tax-credit donation webapp.

The platform helps parents, students, schools, individual donors, and business donors create and support scholarship campaigns. It includes public fundraising campaigns, donation flows, tax-credit donation logic, PayPal payments, user accounts, hybrid user roles, campaign approvals, tax receipts, scholarship recommendations, compliance tracking, and Super Admin controls.

The webapp is also connected to the WordPress website:

```text
https://arizonachristiantuition.com
```

WordPress/Fluent tools involved:

- WordPress REST API
- FluentCRM Pro
- FluentBoards Pro
- FluentBooking Pro

---

## Working Style

When working in this repo:

- Understand before editing.
- Preserve working code.
- Do not rebuild the app from scratch.
- Follow existing conventions.
- Keep changes modular and clear.
- Prefer small, safe, reviewable changes.
- Make production-minded decisions.
- Protect sensitive donor, student, payment, tax, and scholarship data.
- Think through Supabase relationships before writing code.
- Use server-side checks for sensitive operations.
- Use clear implementation plans for multi-step work.
- Explain blockers honestly.

Do not make assumptions about credentials, services, or database tables without inspecting the repo.

---

## Current Main Goal

Button up the project and finish the core production systems.

The highest-priority systems are:

1. PayPal donations.
2. User accounts.
3. Hybrid User account switching.
4. Supabase relationships.
5. Campaign creation and approval.
6. Super Admin dashboard.
7. Tax receipts.
8. Donation allocations.
9. Campaign backers, comments, and reviews.
10. WordPress/FluentCRM/FluentBoards/FluentBooking integration verification.

---

## Product Context

The live app currently includes:

- Public homepage.
- Campaign cards.
- Campaign detail pages.
- Featured campaigns.
- New student campaigns.
- Campaign progress data.
- Donor counts.
- Days-left display.
- School type browsing.
- Tax-credit messaging.
- Campaign creation wizard.
- Registration by account type.
- Detailed donation flow.
- Giving levels.
- QR/social sharing.
- Campaign story, updates, donors, and FAQ sections.

Campaign creation currently follows a multi-step pattern:

```text
Campaign → Parent Info → Student → School
```

Tax-credit donation currently follows a multi-step pattern:

```text
Donors → Taxes → Billing → Review & Pay
```

Preserve these patterns where possible.

---

## User Types

The app must support:

```text
Super Admin
Parent / Guardian
Student
Individual Donor
Business Donor
Hybrid User
```

### Hybrid User

The Hybrid User is a major project requirement.

A Hybrid User is one login/email account that can access one or more account types:

```text
Parent / Guardian
Student
Individual Donor
Business Donor
```

The user should be able to switch between roles in the dashboard.

A Hybrid User should have:

- One Supabase Auth user.
- One `profiles` row.
- Multiple rows in `user_roles`.
- Role-specific profile rows as needed.
- Completion progress per role.
- Ability to add another account type later.
- No duplicate login accounts for the same email.

Super Admin is not a normal selectable role and must be restricted.

---

## Donation Types

The app must support two primary PayPal donation flows.

### Quick Donation

Fast, simple donation.

Should support:

- Campaign donation.
- General donation.
- Giving level.
- Custom amount.
- Anonymous giving.
- Optional donor message.
- Public display preferences.
- PayPal checkout.
- Server-side PayPal verification.
- Campaign backer creation.
- Campaign totals update.
- Confirmation email.

### Tax Credit Donation

More detailed Arizona tax-credit donation.

Should support:

- Legal donor name.
- Billing address.
- Email.
- Phone.
- Tax year.
- Filing status.
- Arizona resident confirmation.
- Tax-credit limits.
- Campaign/school/student recommendation.
- Consent to terms/privacy/tax disclosure.
- PayPal checkout.
- Server-side PayPal verification.
- Tax receipt generation.
- Confirmation/receipt email.

### Payment Rule

Never mark a donation as paid based only on frontend success.

Always verify PayPal server-side and/or through verified webhook processing.

---

## Supabase Design Principles

Use Supabase Auth for login and app tables for domain data.

Core auth relationship:

```text
auth.users
   ↓
profiles
   ↓
user_roles
   ↓
account_setup_progress
```

Role-specific profiles:

```text
profiles
   ├── parent_guardian_profiles
   ├── individual_donor_profiles
   ├── business_donor_profiles
   └── student_profiles
```

Student/guardian relationship:

```text
profiles / parent_guardian_profiles
   ↓
student_guardians
   ↓
student_profiles
   ↓
schools
```

Campaign relationship:

```text
profiles
   ↓
campaigns
   ↓
campaign_students
   ↓
student_profiles
```

Campaign supporting tables:

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

Donation relationship:

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

Scholarship relationship:

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

---

## Recommended Core Tables

Verify existing schema before creating anything.

Expected tables include:

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

If the current schema uses different names, do not blindly rename everything. First determine whether existing tables can be mapped or extended safely.

---

## Super Admin Dashboard

The Super Admin dashboard must give complete control to the three approved Super Admin users.

Super Admin dashboard should include:

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

Super Admins should be able to:

- Review users.
- Manage roles.
- Review hybrid profiles.
- Review/approve/reject campaigns.
- View donations.
- View PayPal payment events.
- View donation allocations.
- Generate/resend receipts.
- Review scholarship recommendations.
- Moderate comments/reviews/backers.
- Manage schools.
- Manage students.
- View compliance checks.
- View integration health.
- View activity logs.

Super Admin checks must happen server-side, not only in the UI.

---

## WordPress and Fluent Integration Context

The app is connected to:

```text
https://arizonachristiantuition.com
```

Verify integrations instead of assuming they work.

### WordPress API

Check:

- Base URL.
- Auth method.
- API client.
- Server-only credentials.
- Existing endpoints.
- Sync direction.
- Error logging.

### FluentCRM Pro

Used for:

- Marketing.
- Contact management.
- Contact field metadata.
- Triggering automations.
- Email campaigns.

Recommended synced events:

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

### FluentBoards Pro

Used for:

- Project management.
- Campaign review tasks.
- Internal updates.
- Workflow automation.

Recommended triggers:

```text
new_campaign_pending_review
new_school_pending_approval
new_scholarship_application
failed_payment_needs_review
compliance_check_failed
new_business_donor_registered
```

### FluentBooking Pro

Used for:

- Appointments.
- Calendar sync.
- Consultation scheduling.
- Email automation.

Recommended data:

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

## Webhooks

Expected or recommended webhook routes:

```text
/api/webhooks/paypal
/api/webhooks/wordpress
/api/webhooks/fluentcrm
/api/webhooks/fluentboards
/api/webhooks/fluentbooking
```

Webhook requirements:

- Verify signature/secret where supported.
- Store raw event.
- Process safely and idempotently.
- Log successes and failures.
- Never silently fail.
- Never double-count donations.

---

## Supabase Storage Buckets

Expected buckets:

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

Storage rules:

- Campaign public images can be public.
- Receipts should be private.
- Documents should be private.
- Student photos should be permissioned carefully.
- Store `storage_path`, not only public URLs.
- Use signed URLs for private files.

---

## Security Priorities

This app handles:

- Donations.
- Payment data.
- Student data.
- Family data.
- Tax-credit records.
- Scholarship recommendations.
- Business donor information.
- Receipts.
- Compliance records.

Security requirements:

- Enable and respect Supabase RLS.
- Keep secrets server-side.
- Verify PayPal payments server-side.
- Verify webhooks.
- Protect admin routes server-side.
- Protect student and donor data.
- Moderate comments/reviews by default.
- Do not expose EIN, billing info, receipts, or sensitive student details publicly.
- Do not publish campaigns without approval.

---

## Environment Variables to Verify

Use existing project naming if already established, but verify equivalents for:

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

Never expose private keys to the frontend.

---

## Suggested Workflow

For large tasks, work in this order:

1. Inspect current implementation.
2. Report what exists and what is missing.
3. Propose a short implementation plan.
4. Make targeted changes.
5. Add/update migrations if needed.
6. Add/update server actions/API routes if needed.
7. Add/update UI if needed.
8. Run checks.
9. Summarize changes and blockers.

---

## Acceptance Criteria

Consider work complete only when:

- Existing functionality is preserved.
- Sensitive operations are server-validated.
- Supabase relationships are correct.
- RLS impact is addressed.
- PayPal payments are verified server-side.
- Webhook handling is idempotent.
- Hybrid roles work through one email/login.
- Super Admin access is securely protected.
- User-facing flows have loading/error/success states.
- Database changes include migrations.
- Available checks are run.
- Changed files are summarized.

---

## Final Project Priorities

When tradeoffs are required, prioritize in this order:

1. Payment correctness and donation integrity.
2. User account and Hybrid User correctness.
3. Supabase schema and RLS security.
4. Student/family privacy.
5. Super Admin control and auditability.
6. Campaign approval workflow.
7. Tax receipt/compliance accuracy.
8. WordPress/Fluent integration reliability.
9. Clean UX.
10. Future extensibility.
