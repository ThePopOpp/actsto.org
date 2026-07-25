# ACTSTO.org — Student Safeguards (Under 16 & 16+)

> **Status:** Working reference. Not yet published. Candidate content for the
> **Privacy Policy** and/or **Terms of Service**, and the source of truth for
> product/permission decisions involving minors.
>
> **Last updated:** 2026-07-24
> **Owner:** Super Admin / Legal
> **Related:** [[dm-permission-matrix]] · `lib/messaging/permissions.ts` ·
> `students.age_verified` · `students.allow_donor_messages` · `student_guardians`

ACTSTO.org handles data for minors attending Arizona Christian schools. Because a
student may be **under 16** (parent/guardian-managed, no login) or **16+**
(self-managed login account), safeguards are defined per age band. The technical
boundary is the `students.student_user_id` field: **only 16+ students receive a
self-managed login account**; younger students exist only as guardian-managed
records.

---

## 1. Guiding principles

1. **Minimize** — collect and expose the least student data necessary.
2. **Guardian-first for under 16** — a parent/guardian mediates all access,
   contact, and consent for younger students.
3. **Consent is explicit and revocable** — especially for photos, public
   display, and any donor contact.
4. **No unsolicited adult-to-minor contact** — donors never reach a student
   without an explicit, logged opt-in.
5. **Everything sensitive is server-enforced and auditable** — UI hiding is not
   a safeguard; the server authorizes and logs.
6. **Compliance posture** — align with COPPA (under 13), general minor-privacy
   best practice, FERPA-adjacent school-data norms, and Arizona law.

---

## 2. Safeguards for students **under 16**

| Area | Safeguard |
|---|---|
| **Account** | No self-managed login. Record is created and controlled by a parent/guardian (`parent_user_id`). No `student_user_id` is issued. |
| **Direct messages** | **Cannot send or receive DMs.** They have no login and are excluded from the messaging system entirely. |
| **Donor contact** | **No direct donor contact of any kind** — no DM, email, SMS, or call. All donor communication is routed to the guardian. |
| **Public display** | Name shown as first name + last initial (or nickname) at most; no full DOB, address, school schedule, or contact info public. |
| **Photos / media** | Require explicit guardian consent before upload or public display. Default to private. Store `storage_path`, serve via signed URLs where non-public. |
| **PII** | Birth date, exact age, phone, email, and precise location are never exposed publicly and are restricted internally to guardians + Super Admins. |
| **Campaigns** | A student may be a beneficiary, but the campaign is created/managed by the guardian; student is not independently solicitable. |
| **Communications** | Email/SMS opt-ins are held by the guardian, not the child. |
| **Under 13 (COPPA)** | Treat with heightened care: verifiable parental consent for any data collection; no behavioral tracking; no third-party ad/analytics tied to the child. |

---

## 3. Safeguards for students **16+**

16+ students may self-manage, but guardian linkage and safety rails remain.

| Area | Safeguard |
|---|---|
| **Account** | Self-managed login (`student_user_id`) after invite acceptance. `age_verified` should be set before enabling adult-contact features. |
| **Direct messages** | May DM **parents** and **donors** per the role matrix — **but donor↔student requires the student's explicit opt-in** (`students.allow_donor_messages`, default **false**). |
| **Donor contact — opt-in** | A donor cannot start a conversation with a 16+ student unless that student has enabled "allow donor messages." Opt-in is revocable at any time; revoking blocks new donor-initiated contact. |
| **Guardian linkage** | Remains linked via `student_guardians`; guardians retain visibility rights as configured. |
| **Public display** | Still minimize: no exact DOB, home address, or private contact info public without consent. |
| **Photos / media** | Student may manage own media, but public display still respects consent and platform moderation. |
| **Moderation** | Comments/reviews/messages subject to moderation and reporting. |
| **Data rights** | Student (and guardian, where applicable) can request export/deletion of their data. |

---

## 4. Cross-cutting safeguards (all students)

- **Server-side authorization** for every messaging, campaign, donation-allocation,
  and profile-access action — never rely on hidden UI.
- **Audit logging** of sensitive events (role changes, donor↔student contact,
  photo publication, consent changes).
- **Consent records** are versioned and timestamped (mirror the SMS consent
  pattern: disclosure version + text + IP + user agent).
- **Reporting & block** — any participant can report or block a conversation;
  Super Admins can review and intervene.
- **Data retention** — define and enforce retention limits for messages, media,
  and logs; purge on account deletion.
- **RLS** — enforce Row Level Security so a user can only read their own
  conversations/messages/records.
- **No third-party minor data sharing** — do not send minor PII to external
  services (CRM, ads, analytics) without a lawful basis and consent.

---

## 5. Candidate placement on the site

- **Privacy Policy** → a "Children's & Minors' Privacy" section covering: what we
  collect for students, guardian consent, under-13 COPPA handling, photo/media
  consent, and data rights.
- **Terms of Service** → a "Student Accounts & Messaging" section covering: 16+
  self-managed accounts, the messaging opt-in, prohibited conduct, and
  moderation/enforcement.
- **In-product** → a student/guardian "Safety & Messaging" settings page exposing
  the `allow_donor_messages` toggle and consent controls.

---

## 6. Open items / to decide

- [ ] Legal review of COPPA (under 13) obligations and verifiable parental consent flow.
- [ ] Confirm Arizona-specific requirements for minor data + scholarship records.
- [ ] Decide guardian visibility scope into a 16+ student's donor conversations.
- [ ] Data-retention windows for DMs and media.
- [ ] Whether donor↔student conversations should also be admin-audited (not just opt-in).
- [ ] Publish the finalized language into Privacy Policy + ToS.
