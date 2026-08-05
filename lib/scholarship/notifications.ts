import "server-only";

import { fireAutomationEvent } from "@/lib/automations/fire";
import { sendEmail } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";
import { formatWindowDate } from "@/lib/scholarship/windows";

/**
 * Notifications for the scholarship application workflow.
 *
 * Every message goes out through the transactional provider the site already
 * uses (`lib/email/send.ts`, which logs to `email_logs`) and drops a matching
 * dashboard item. No second provider.
 *
 * Two rules are enforced here rather than left to callers:
 *   - `internal_note` never reaches a parent. These functions only accept the
 *     `parentMessage` field, so there is no call site where the wrong one can
 *     be passed by mistake.
 *   - An approval email never implies an award amount.
 */

function appUrl(): string {
  return (process.env.APP_URL ?? "https://actsto.org").replace(/\/$/, "");
}

function firstNameOf(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] || "there";
}

type Recipient = {
  profileId: string | null;
  email: string;
  name: string | null;
};

async function notify(args: {
  to: Recipient;
  subject: string;
  body: string[];
  cta: { label: string; path: string };
  templateKey: string;
  dashboardTitle: string;
  dashboardType: string;
}): Promise<void> {
  const url = `${appUrl()}${args.cta.path}`;
  const text = [...args.body, "", `${args.cta.label}: ${url}`].join("\n\n");
  const html = [
    ...args.body.map((p) => `<p style="margin:0 0 14px">${escapeHtml(p)}</p>`),
    `<p style="margin:22px 0 0"><a href="${url}">${escapeHtml(args.cta.label)}</a></p>`,
  ].join("\n");

  await sendEmail({
    to: args.to.email,
    subject: args.subject,
    text,
    html,
    templateKey: args.templateKey,
  }).catch((error) => {
    // A failed notification must not roll back a decision that has already been
    // recorded — but it must be visible.
    console.error("[scholarship] notification email failed", {
      to: args.to.email,
      templateKey: args.templateKey,
      error,
    });
  });

  if (args.to.profileId) {
    await prisma.dashboardNotification
      .create({
        data: {
          userId: args.to.profileId,
          title: args.dashboardTitle,
          message: args.body[0] ?? null,
          notificationType: args.dashboardType,
          actionUrl: args.cta.path,
        },
      })
      .catch(() => {});
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Parent-facing ────────────────────────────────────────────────────────────

export async function notifyApplicationSubmitted(args: {
  to: Recipient;
  studentName: string;
  schoolYear: string;
  confirmationCode: string;
  applicationId: string;
  isResubmission?: boolean;
}): Promise<void> {
  const opening = args.isResubmission
    ? `We've received the new application for ${args.studentName} for the ${args.schoolYear} school year.`
    : `We've received the scholarship application for ${args.studentName} for the ${args.schoolYear} school year.`;

  await notify({
    to: args.to,
    subject: `Application received — ${args.confirmationCode}`,
    templateKey: "scholarship_application_submitted",
    dashboardTitle: "Application submitted",
    dashboardType: "scholarship_application",
    body: [
      `Hi ${firstNameOf(args.to.name)},`,
      opening,
      `Your confirmation code is ${args.confirmationCode}. Keep it — quote it whenever you contact us about this application.`,
      "Our team reviews every application by hand. We'll email you when there's a decision, or sooner if we need anything else from you. Your application is locked while it's with us, but you can read everything you sent at any time.",
    ],
    cta: { label: "View your application", path: `/dashboard/parent/apply/${args.applicationId}` },
  });

  await fireAutomationEvent("application_submitted", {
    userId: args.to.profileId,
    email: args.to.email,
    fields: {
      first_name: firstNameOf(args.to.name),
      full_name: args.to.name ?? "",
      email: args.to.email,
      student_name: args.studentName,
      school_year: args.schoolYear,
      confirmation_code: args.confirmationCode,
      site_url: appUrl(),
    },
  }).catch(() => {});
}

export async function notifyInformationRequested(args: {
  to: Recipient;
  studentName: string;
  applicationId: string;
  parentMessage: string;
  dueAt: Date;
}): Promise<void> {
  const due = formatWindowDate(args.dueAt);

  await notify({
    to: args.to,
    subject: `We need a little more for ${args.studentName}'s application`,
    templateKey: "scholarship_information_requested",
    dashboardTitle: "More information needed",
    dashboardType: "scholarship_application",
    body: [
      `Hi ${firstNameOf(args.to.name)},`,
      `Our review team needs something else before we can finish reviewing ${args.studentName}'s application.`,
      args.parentMessage,
      `Please respond by ${due}. We've reopened just the sections this affects — everything else stays as you submitted it.`,
      "If you can't make that date, tell us and we'll extend it. We'd rather hear from you than close the file.",
    ],
    cta: { label: "Update your application", path: `/dashboard/parent/apply/${args.applicationId}` },
  });

  await fireAutomationEvent("application_info_requested", {
    userId: args.to.profileId,
    email: args.to.email,
    fields: {
      first_name: firstNameOf(args.to.name),
      email: args.to.email,
      student_name: args.studentName,
      due_date: due,
      site_url: appUrl(),
    },
  }).catch(() => {});
}

export async function notifyInformationReminder(args: {
  to: Recipient;
  studentName: string;
  applicationId: string;
  dueAt: Date;
  daysRemaining: number;
}): Promise<void> {
  const due = formatWindowDate(args.dueAt);
  const urgency =
    args.daysRemaining <= 1
      ? `Today is the last day we can hold ${args.studentName}'s application open.`
      : `There are ${args.daysRemaining} days left to respond.`;

  await notify({
    to: args.to,
    subject: `Reminder: ${args.studentName}'s application needs your reply by ${due}`,
    templateKey: "scholarship_information_reminder",
    dashboardTitle: "Application reminder",
    dashboardType: "scholarship_application",
    body: [
      `Hi ${firstNameOf(args.to.name)},`,
      `We're still waiting on the information we asked for on ${args.studentName}'s scholarship application. ${urgency} The deadline is ${due}.`,
      "If the deadline is a problem, reply and tell us — we can extend it.",
    ],
    cta: { label: "Update your application", path: `/dashboard/parent/apply/${args.applicationId}` },
  });
}

export async function notifyApplicationApproved(args: {
  to: Recipient;
  studentName: string;
  schoolYear: string;
  applicationId: string;
  awardHeldForEsa: boolean;
}): Promise<void> {
  const body = [
    `Hi ${firstNameOf(args.to.name)},`,
    `${args.studentName}'s scholarship application for ${args.schoolYear} has been approved.`,
    // Families read "approved" as "we're getting money" unless you are explicit,
    // and correcting that later is a painful conversation.
    "Approval means the application is complete and your student is eligible to be considered for an award. It isn't an award itself, and it doesn't set an amount. Award decisions are made separately, and we'll write to you again when yours is decided.",
  ];

  if (args.awardHeldForEsa) {
    body.push(
      "One thing to know: because you told us an ESA contract is or may be in place for this student, any award will be held in your student's name rather than sent to the school. We can release it once the Arizona Department of Education confirms the contract was closed or allowed to lapse.",
    );
  }

  await notify({
    to: args.to,
    subject: `${args.studentName}'s application is approved`,
    templateKey: "scholarship_application_approved",
    dashboardTitle: "Application approved — pending award decision",
    dashboardType: "scholarship_application",
    body,
    cta: { label: "View your application", path: `/dashboard/parent/apply/${args.applicationId}` },
  });

  await fireAutomationEvent("application_approved", {
    userId: args.to.profileId,
    email: args.to.email,
    fields: {
      first_name: firstNameOf(args.to.name),
      email: args.to.email,
      student_name: args.studentName,
      school_year: args.schoolYear,
      site_url: appUrl(),
    },
  }).catch(() => {});
}

export async function notifyApplicationDenied(args: {
  to: Recipient;
  studentName: string;
  schoolYear: string;
  applicationId: string;
  parentMessage: string;
  canReapply: boolean;
  reapplyBy: Date | null;
}): Promise<void> {
  const body = [
    `Hi ${firstNameOf(args.to.name)},`,
    `We weren't able to approve ${args.studentName}'s scholarship application for ${args.schoolYear}.`,
    args.parentMessage,
  ];

  // Families do not know whether they can try again, and the alternative to
  // telling them is a phone call.
  if (args.canReapply && args.reapplyBy) {
    body.push(
      `You can submit a new application for this school year until ${formatWindowDate(args.reapplyBy)}. We'll carry your answers over so you're editing rather than starting again.`,
    );
  } else if (args.canReapply) {
    body.push(
      "You can submit a new application for this school year. We'll carry your answers over so you're editing rather than starting again.",
    );
  } else {
    body.push(
      "Applications for this school year have closed, so a new application isn't possible right now. Please contact us if your circumstances have changed — we'd rather talk it through than leave it here.",
    );
  }

  await notify({
    to: args.to,
    subject: `About ${args.studentName}'s scholarship application`,
    templateKey: "scholarship_application_denied",
    dashboardTitle: "Application not approved",
    dashboardType: "scholarship_application",
    body,
    cta: { label: "View your application", path: `/dashboard/parent/apply/${args.applicationId}` },
  });

  await fireAutomationEvent("application_denied", {
    userId: args.to.profileId,
    email: args.to.email,
    fields: {
      first_name: firstNameOf(args.to.name),
      email: args.to.email,
      student_name: args.studentName,
      school_year: args.schoolYear,
      site_url: appUrl(),
    },
  }).catch(() => {});
}

export async function notifyApplicationReopened(args: {
  to: Recipient;
  studentName: string;
  applicationId: string;
  parentMessage: string | null;
}): Promise<void> {
  await notify({
    to: args.to,
    subject: `${args.studentName}'s application is open for edits again`,
    templateKey: "scholarship_application_reopened",
    dashboardTitle: "Application reopened",
    dashboardType: "scholarship_application",
    body: [
      `Hi ${firstNameOf(args.to.name)},`,
      `We've unlocked ${args.studentName}'s scholarship application so you can make changes.`,
      args.parentMessage ?? "Submit it again once you're done and it'll go back into the review queue.",
    ],
    cta: { label: "Edit your application", path: `/dashboard/parent/apply/${args.applicationId}` },
  });
}

export async function notifyDraftDeadline(args: {
  to: Recipient;
  studentName: string | null;
  schoolYear: string;
  applicationId: string;
  closesAt: Date;
  daysRemaining: number;
}): Promise<void> {
  const closes = formatWindowDate(args.closesAt);
  const subject =
    args.daysRemaining <= 0
      ? `Today is the last day to apply for ${args.schoolYear}`
      : `${args.daysRemaining} days left to finish your ${args.schoolYear} application`;

  await notify({
    to: args.to,
    subject,
    templateKey: "scholarship_draft_deadline",
    dashboardTitle: "Unfinished application",
    dashboardType: "scholarship_application",
    body: [
      `Hi ${firstNameOf(args.to.name)},`,
      // Most incomplete applications are forgotten, not abandoned.
      `You have an unfinished scholarship application${args.studentName ? ` for ${args.studentName}` : ""} for the ${args.schoolYear} school year. Applications close on ${closes}.`,
      "Everything you've entered so far is saved. Picking it back up should take a few minutes.",
    ],
    cta: { label: "Finish your application", path: `/dashboard/parent/apply/${args.applicationId}` },
  });
}

// ── Staff-facing ─────────────────────────────────────────────────────────────

/**
 * A family replied after their information deadline had already lapsed. The
 * application is sitting in the queue flagged as no-response, and somebody
 * needs to know it isn't any more.
 */
export async function notifyStaffOfLateResponse(applicationId: string): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) return;

  const application = await prisma.scholarshipApplication.findUnique({
    where: { id: applicationId },
    select: {
      confirmationCode: true,
      schoolYear: true,
      student: { select: { firstName: true, lastName: true } },
    },
  });
  if (!application) return;

  const studentName =
    [application.student.firstName, application.student.lastName].filter(Boolean).join(" ") ||
    "a student";

  await sendEmail({
    to: adminEmail,
    subject: `Late reply on ${application.confirmationCode ?? "an application"} — ${studentName}`,
    text: [
      `${studentName} (${application.schoolYear ?? "no year"}) has updated their application after the information deadline had passed.`,
      "It was flagged as no-response; that flag is now cleared and it needs another look.",
      `${appUrl()}/dashboard/admin/scholarships/${applicationId}`,
    ].join("\n\n"),
    templateKey: "scholarship_staff_late_response",
  }).catch((error) => {
    console.error("[scholarship] late response notice failed", error);
  });
}

/** Route a submitted application to whoever is reviewing. */
export async function notifyStaffOfSubmission(args: {
  studentName: string;
  schoolYear: string;
  applicationId: string;
  confirmationCode: string;
  attemptNumber: number;
  esaHold: boolean;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) return;

  const flags: string[] = [];
  if (args.attemptNumber >= 3) {
    flags.push(
      `This is attempt ${args.attemptNumber} for this student and year. Worth a phone call — by a third attempt the cause is usually something a two-minute conversation fixes.`,
    );
  }
  if (args.esaHold) {
    flags.push("The family reported a current or planned ESA contract. Any award is held pending documentation.");
  }

  await sendEmail({
    to: adminEmail,
    subject: `Application ${args.confirmationCode} — ${args.studentName} (${args.schoolYear})`,
    text: [
      `${args.studentName} · ${args.schoolYear} · attempt ${args.attemptNumber}`,
      ...flags,
      `${appUrl()}/dashboard/admin/scholarships/${args.applicationId}`,
    ].join("\n\n"),
    templateKey: "scholarship_staff_submission",
  }).catch((error) => {
    console.error("[scholarship] staff submission notice failed", error);
  });
}
