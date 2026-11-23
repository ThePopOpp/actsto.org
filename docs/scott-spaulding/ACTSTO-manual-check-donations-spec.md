# Spec: Record Check (Offline) Donations in the Admin Portal

**Organization:** Arizona Christian Tuition (ACTSTO), https://actsto.org
**Prepared:** Nov 12, 2026
**Priority:** High. Checks are a normal way for individuals and businesses to give, and today they cannot be recorded.

---

## 1. Summary

Super admins need to enter a donation that arrived by check (or other offline method) so it behaves exactly like an online donation: it counts in campaign and dashboard totals, carries a funding source, is available to the Allocation tool, appears in the Donors list, and produces an Arizona tax-credit receipt.

## 2. Current state (observed Nov 12, 2026 from the live super admin UI)

These are UI observations, not code review. Please confirm against the code.

- **Payments** (`/dashboard/admin/billing`) lists only PayPal checkouts (columns: Created, Status, Amount, Funding source, Campaign, Receipt, PayPal order, Capture). Controls are the Paid / Pending / Failed-cancelled / All filter, "Cancel abandoned checkouts", "Remove N archived sandbox tests", and per-row **Edit** and **Remove test**. Edit appears to change the funding source only. There is no "Add" or "Record" action.
- **Donors** (`/dashboard/admin/backers`) is a read-only list (search, status/campaign/date filters, "Missing receipt", saved views, CSV, and call/SMS/email buttons). No add control.
- **Receipts** (`/dashboard/admin/receipts`) lists receipts for paid donations (statuses: Emailed, Generated, void). No way to issue a receipt without an online payment behind it.
- Public donation forms (individual and `/donate/business`) end in "Review & Pay" and have no offline/check option.
- Existing behavior to preserve: every donation carries a **funding source**; sandbox tests are excluded from all totals; Paid volume on Payments, the Dashboard and Allocation must agree.

## 3. Goal and non-goals

**Goal:** A super admin can record a received check against a donor, campaign, funding source and school recommendation, and the resulting donation is indistinguishable from an online paid donation everywhere downstream, except that its payment method is "Check".

**Non-goals (v1):**
- Accepting checks online, photographing or scanning checks, or bank integration.
- Cash, wire, ACH, stock or other methods beyond a simple "payment method" field (design the field so these can be added later).
- Donor-facing "pay by check" instructions (listed as an optional follow-up in section 11).

## 4. Who can use it

- Super admin only in v1. Confirm whether a limited "Finance/Staff" role exists or is planned. If it does, it should be able to record but not delete.
- Every create, edit, void and delete is written to an audit log (who, when, before/after values).

## 5. Functional requirements

### 5.1 Entry point
- Add a **"Record check donation"** button on the Payments screen (primary), with a matching shortcut on the Donors screen.
- Opens a form (modal or page). Fields below.

### 5.2 Form fields

**Donor**
| Field | Required | Notes |
|---|---|---|
| Donor type | Yes | Individual or Business. Drives which fields and funding sources show. |
| Existing donor / account lookup | No | Search by name or email. Linking to an existing user is optional; a check donor may have no account. |
| Individual: first, middle, last name | Yes (individual) | |
| Business: legal business name, EIN | Yes (business) | Same validation as `/donate/business`. |
| Business contact: name, title | Business: contact name required | |
| Address (street, unit, city, state, ZIP) | Yes | Needed for the receipt. |
| Email | No, but warn if blank | Needed to email the receipt. If blank, receipt is generated for download or print only. |
| Phone | No | |

**Gift**
| Field | Required | Notes |
|---|---|---|
| Amount | Yes | Positive, two decimals, upper limit sanity check with a confirm prompt (suggest over $100,000). |
| Payment method | Yes | Default "Check". Options: Check, Cashier's check, Money order. Stored as an enum so other methods can be added. |
| Check number | Yes for Check / Cashier's check | Free text. Warn (do not block) on a duplicate check number from the same donor. |
| Name on check / drawer | No | Used when it differs from the donor (for example a joint account, a business paying for an owner, or a donor-advised fund). |
| Date on check | No | |
| **Date received** | Yes | Defaults to today. This is the date the gift is recorded as received. |
| Date deposited | No | For reconciliation. |
| Memo / internal notes | No | Not shown on the receipt. |
| Attachment | No | Optional image or PDF of the check and any enclosed letter. Treat as sensitive financial data (see 7.4). |

**Tax credit and fund fields** (same as the online flows)
| Field | Required | Notes |
|---|---|---|
| Funding source | Yes | Must be set at entry, no "Not set". Confirmed full list: **Individual Original, Individual Overflow / Switcher, Unrestricted, Corporate low-income, Corporate disabled/displaced.** Individual donors see the first three; business donors see the two corporate programs. A single check may be **split** across funding sources (see 5.4). |
| Campaign | No | Dropdown of active campaigns. A donation with no campaign is general/unrestricted to ACT. |
| Recommended school | No | Businesses: school only (default Valley Christian Schools), never a student. Individuals: school or student(s). |
| Recommended student(s) | No | Individuals only, only students on the chosen campaign. Required relationship acknowledgment (see 5.5). |
| Tax year | Yes | Defaults to the calendar year of the **date on the check** (falls back to date received if no check date is entered). Always editable. For any check dated or received Jan 1 to Apr 15, the donor may want it applied to the prior or the current tax year, so the form must show an explicit **"Confirm tax year with donor"** choice (prior year / current year) that the admin has to select before saving. See 5.7. |
| Filing status | Yes (individual donors) | Captured at entry, same options as the online individual form. Editable after saving so it can be corrected once the donor confirms. Not collected for business donors. |

### 5.3 Behavior on save
1. Create a donation record with status **Paid**, payment method **Check**, and no PayPal order or capture IDs (those columns show "Check #1234" or similar instead).
2. Apply the same downstream rules as an online paid donation:
   - Counts in Paid volume on Payments, the Dashboard and Allocation.
   - Available to Allocation under its funding source, with the same eligibility, tuition and cap enforcement.
   - Counts toward the campaign's donation totals (and donor count) using the shared calculation already used elsewhere. Note: campaign progress bars show money **awarded to students**, not money received, so a check will not move the bar until it is allocated, the same as online gifts.
   - Appears in the Donors list, CSV exports and accounting reports.
3. Generate the Arizona tax-credit receipt (section 6) and, if an email exists and the admin ticks "Email receipt now," send it. Otherwise leave it as **Generated** so it can be sent later from Receipts.
4. Show a confirmation with the receipt number and a link to the donation.

### 5.4 Split gifts
One check can fund more than one funding source (for example a donor splits a check between Original and Overflow). The existing data already shows this on online gifts (one $22,000 donation with Original $1,570, Overflow $1,561 and Unrestricted $18,869). The form should allow adding allocation lines by funding source that must **sum exactly to the check amount**, with a running "remaining" amount. Block save until the total matches.

### 5.5 Student recommendation and compliance guardrails
- A recommendation is **non-binding**. The form shows the same notice used online.
- Individual donors recommending a student must have the **relationship acknowledgment** recorded (the donor may not direct the gift to their own dependent or family member). For a check, the admin attests that the donor confirmed this, or the donor signs a paper form that is attached. Record who attested and when.
- Business donors: the server must reject any student link, as on the online business form.
- Do not tell donors whether a recommended student received an award (per existing award policy).
- Required notice language (A.R.S. 43-1603(C)) must appear on any donor-facing document produced for the check flow, including a printable donation form (see 11).

### 5.7 Tax year selection (Jan 1 to Apr 15 window)
Arizona credit donations made between Jan 1 and Apr 15 can be claimed for either the prior or the current tax year, at the donor's choice. Requirements:
- Default tax year = year of the check date (or date received if none).
- If the check date or date received falls Jan 1 to Apr 15, show both options (for example "2026" and "2027") and **require** the admin to pick one, with a note "Confirm with donor." No silent default in this window.
- Outside that window, the default is pre-selected and still editable.
- The receipt shows the selected tax year.
- Changing tax year (or filing status) after a receipt is issued requires a reason, voids the old receipt with a link, and issues a new one. Both changes are audit logged, including who confirmed with the donor and when (free-text "confirmed with donor on" note).
- Tax year is stored explicitly on the donation and drives all reports and exports.

### 5.6 Editing, voiding and bounced checks
- **Edit:** Before a receipt is issued, all fields can be edited. After a receipt is issued, changes to donor, amount, date, tax year or funding source require a reason and either re-issue the receipt (new number, old one voided with a link) or are blocked. Mirror the current behavior for online gifts.
- **Void / returned check (NSF):** A "Mark returned or void" action with a reason. It voids the receipt, removes the amount from totals, and **blocks or reverses** any allocation already made from it. If money has already been awarded to a school, show a clear warning and require a super admin decision. Do not silently reduce awards.
- **Delete:** Not allowed for real records. Only super admin "Remove test" for clearly marked test entries, consistent with the existing sandbox tools. Prefer void over delete.
- Every change is audit logged.

## 6. Receipts

- Same receipt template and numbering sequence as online gifts (`ACT-YYYY-XXXXXXXX`), issued to the donor (individual) or the business (with EIN and program) as on current receipts.
- Receipt must show: donor or business name and address, amount, **date received**, payment method and check number, tax year, funding program, ACTSTO name, certification details as on current receipts, and the required notices.
- Receipts page shows these with payment method "Check" and the same statuses (Generated, Emailed, void).
- Missing-receipt filter on Donors must include check donations.
- Retention: follow the 4-year retention rule used for supporting documents, and apply the audit hold feature to any attached check images.

## 7. Compliance and data considerations (confirm with CPA / tax attorney / ADOR STO unit)

1. **Tax year rules for checks (decided by ACTSTO).** Default is the tax year of the check, and the admin can change it based on the donor's feedback. For gifts dated Jan 1 to Apr 15 the donor may choose the prior or current year, so selection is required in that window (see 5.7). Compliance should still confirm the exact cutoff date each year and what date evidence to keep (check date, received date, postmark), and the receipt wording.
2. **Individual filing status (decided by ACTSTO).** Filing status is captured at entry and confirmed with the donor, and must be editable afterward. Compliance to confirm whether ACTSTO enforces or only reports the per-filer credit limits.
3. **Corporate credits.** Business donors must give EIN and a program choice (low-income or disabled/displaced), as on the online business form.
4. **Fund restrictions.** Corporate low-income and disabled/displaced money must only be allocated to qualifying students. A check must not be saveable without a funding source, since Allocation relies on it.
5. **Sensitive data.** Do not store full bank routing/account numbers. If check images are attached, store them in private, access-controlled storage, never in a public bucket, never indexable, and exclude them from donor-facing views. Consider an option to blur or crop the account number line before saving.
6. **SMS consent.** Do not set SMS opt-in for a check donor unless consent was actually given. Default off.

## 8. Data model (suggested)

Reuse the existing donation record so every downstream feature keeps working. Please adapt to the real schema.

Add or confirm these fields on the donation:
- `payment_method` enum: `paypal`, `check`, `cashiers_check`, `money_order` (existing rows backfilled to `paypal`)
- `check_number`, `drawer_name`, `check_date`, `date_received`, `date_deposited`
- `recorded_by_user_id`, `recorded_at`, `source` (`online` / `admin_manual`)
- `internal_notes`
- `attachment_id` (nullable)
- `returned_at`, `returned_reason` (or a status of `returned`)
- `tax_year` (explicit, not derived at report time), plus `tax_year_confirmed_with_donor_at` / note
- `filing_status` (individual donors; same values as the online form)
- PayPal order and capture IDs become **nullable**, with a constraint that they are required when `payment_method = paypal`.

Constraints and indexes:
- Funding-source allocation lines for a donation must sum to the donation amount (enforce in DB or service layer).
- Unique-ish warning index on (donor, check_number) for duplicate detection (soft, not a hard block).
- Audit log table (or reuse existing) capturing actor, action, entity, before/after.

Totals and reports: confirm every place that computes "paid" (Payments, Dashboard, Allocation, campaign totals, Receipts, Donors, CSV exports, accounting overview) uses one shared definition of "paid donation" that includes manual checks and excludes voided or returned ones and archived sandbox tests.

## 9. UI notes

- Payments list: add a **Payment method** column (PayPal / Check) and show "Check #1234" in the PayPal order column's place for checks. Add a method filter. The Paid/Pending/Failed/All filter keeps working.
- Manual entries should have a small "Manual" badge so they are visible in audits.
- Donors list: same method column and filter.
- Hide PayPal-only actions ("Cancel abandoned checkouts") for checks.
- Form should save a draft on validation failure (do not lose entered data) and support "Save and record another" for batches, since check donations often arrive in groups.
- Optional: a **bulk import** (CSV) for batches of checks, with a preview and per-row validation. Not required for v1, but design the form logic as a reusable service so import can be added.

## 10. Acceptance criteria

1. A super admin can record a check donation from the Payments screen with all required fields, and it appears in Payments and Donors with method "Check" and status Paid.
2. Funding source is mandatory. Split gifts must sum to the check amount or the form will not save.
3. Paid volume on Payments, the Dashboard and Allocation includes the check and all three agree.
4. The donation is available to the Allocation tool under its funding source and is subject to the same eligibility, cap and ESA-hold rules as online gifts.
5. A receipt is generated with the correct donor, date received, check number, tax year and program, appears on the Receipts page, and can be emailed on demand or at save.
6. A business check requires legal name, EIN and program, and the server rejects any student recommendation on it.
7. An individual check with a student recommendation requires the relationship acknowledgment, and recommended students are limited to the chosen campaign.
8. Marking a check returned or void removes it from totals, voids its receipt, and warns or blocks if funds were already allocated or awarded.
9. All create, edit and void actions are in the audit log with the acting user.
10. Duplicate check number for the same donor shows a warning but can proceed.
10a. Tax year defaults to the check's year, requires an explicit prior/current-year choice for gifts dated or received Jan 1 to Apr 15, and can be changed later with a reason and a re-issued receipt.
10b. Individual filing status is captured at entry and can be edited later with an audit trail.
11. Existing online (PayPal) donations are unaffected and keep payment method `paypal` after migration.
12. Check images, if attached, are private and cannot be reached by URL without an admin session.

## 11. Optional follow-ups (not required for v1)

- A public "Give by check" page with mailing address, payee name, and a printable donation form that includes the required STO notices, so donors send complete information with the check.
- A "pending check" status for checks the donor says are in the mail.
- Deposit batching and a reconciliation report (checks grouped by deposit date vs. bank statement).
- Bulk CSV import of checks.
- Extending payment methods to cash, wire, and ACH.

## 12. Test plan

- **Individual check, one fund:** record, verify totals, Donors, receipt, email.
- **Individual check, split across Original and Overflow:** verify sums and Allocation visibility per fund.
- **Individual check with campaign and recommended students:** verify the picker, the relationship acknowledgment, and that the recommendation does not auto-allocate.
- **Business check, corporate low-income:** verify EIN, program, school-only recommendation, and that Allocation limits it to qualifying students.
- **Business check, disabled/displaced:** same, with the disabled/displaced fund.
- **Check with no email:** receipt generated, not sent.
- **Duplicate check number:** warning appears.
- **Return a check after allocation:** warning appears, no silent changes to awards.
- **Date edge cases:** a check dated Dec 31 and received Jan 3; a check dated Jan 2; a check dated Apr 15 and one dated Apr 16. Confirm the required prior/current-year choice appears only in the Jan 1 to Apr 15 window, the default follows the check date, and the choice appears on the receipt.
- **Post-receipt change:** change tax year and filing status after a receipt is issued. Confirm the reason is required, the old receipt is voided and linked, a new receipt is issued, and the audit log records it.
- **Regression:** PayPal donations, receipts, totals and the Paid/Pending filter unchanged. Archived sandbox tests still excluded from totals.
- **Permissions:** a non-super-admin cannot reach the form or the API endpoint.

## 13. Open questions for ACTSTO leadership (answers can change defaults, not the build)

1. Should staff roles below super admin be able to record checks?
2. Do we want a "pending check" status or only record checks once received?
3. Should the relationship acknowledgment for check donors be attested by staff, collected on a paper form, or both?
4. Do we want a public "Give by check" page and printable form in this phase?

*Resolved:* funding-source list (five values, section 5.2), filing status (captured and editable), and tax-year default and override (section 5.7).

---

*Source of the findings above: read-only review of the live site and super admin portal on Nov 12, 2026. Nothing was created, edited or deleted during the review.*
