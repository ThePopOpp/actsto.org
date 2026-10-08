import "server-only";

import { DISPLACED_SCOPE } from "@/lib/eligibility/flags";
import { setFlag } from "@/lib/eligibility/flags-server";
import { isK12 } from "@/lib/grades";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/scholarship/notifications";
import { ScopeError, type StaffActor } from "@/lib/scholarship/scope";

/**
 * Disability and displacement verifications (spec #4).
 *
 * A parent's claim never makes a student eligible by itself. It opens a
 * verification that a reviewer decides in the same queue as applications;
 * only an approval sets the eligibility flag. Displacement is confirmed with
 * DCS once and lasts all of K-12; disability is per school year.
 *
 * Like application reviews, the decision log is append-only.
 */

export type VerificationKind = "disability" | "displacement";

export const VERIFICATION_LABEL: Record<VerificationKind, string> = {
  disability: "Disability verification",
  displacement: "Displacement verification",
};

export const VERIFICATION_STATUS_LABEL: Record<string, string> = {
  pending_review: "Under review",
  awaiting_dcs: "Sent to DCS",
  info_requested: "More information needed",
  approved: "Approved",
  denied: "Not approved",
  withdrawn: "Withdrawn",
};

function appUrl() {
  return (process.env.APP_URL ?? "https://actsto.org").replace(/\/$/, "");
}

async function parentOf(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { firstName: true, parentUserId: true },
  });
  if (!student) return null;
  const parent = await prisma.profile.findUnique({
    where: { id: student.parentUserId },
    select: { id: true, email: true, displayName: true, fullName: true },
  });
  return parent ? { student, parent } : null;
}

async function tellParent(verificationId: string, subject: string, body: string[]) {
  const v = await prisma.studentVerification.findUnique({ where: { id: verificationId }, select: { studentId: true } });
  if (!v) return;
  const who = await parentOf(v.studentId);
  if (!who?.parent.email) return;
  await notify({
    to: { profileId: who.parent.id, email: who.parent.email, name: who.parent.displayName ?? who.parent.fullName },
    subject,
    body,
    cta: { label: "See your student", path: "/dashboard/parent/students" },
    templateKey: "student_verification",
    dashboardTitle: subject,
    dashboardType: "student_verification",
  });
}

async function tellStaff(verificationId: string, kind: VerificationKind, studentName: string) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) return;
  const { sendEmail } = await import("@/lib/email/send");
  await sendEmail({
    to: adminEmail,
    subject: `New ${VERIFICATION_LABEL[kind].toLowerCase()}: ${studentName}`,
    text: `A family has asked us to verify ${studentName}'s ${kind === "disability" ? "disability" : "displaced status"}.\n\nReview it: ${appUrl()}/dashboard/admin/scholarships/verifications/${verificationId}`,
    templateKey: "student_verification_staff",
  }).catch(() => undefined);
}

function log(verificationId: string, action: string, actor: { id: string | null; email: string | null }, notes: { internalNote?: string | null; parentMessage?: string | null } = {}) {
  return prisma.verificationReview.create({
    data: {
      verificationId,
      reviewerId: actor.id,
      reviewerEmail: actor.email,
      action,
      internalNote: notes.internalNote?.trim() || null,
      parentMessage: notes.parentMessage?.trim() || null,
    },
  });
}

/** The school year a new disability claim applies to: the live application's, else the current one. */
async function currentSchoolYear(studentId: string): Promise<string> {
  const app = await prisma.scholarshipApplication.findFirst({
    where: { studentId, schoolYear: { not: null }, status: { notIn: ["denied", "withdrawn"] } },
    orderBy: { createdAt: "desc" },
    select: { schoolYear: true },
  });
  if (app?.schoolYear) return app.schoolYear;
  const now = new Date();
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${start + 1}`;
}

/**
 * A parent marks a student disabled or displaced on the student profile. The
 * flag goes to pending review; nothing is eligible until a reviewer approves.
 */
export async function requestVerification(args: {
  parentId: string;
  parentEmail: string;
  studentId: string;
  kind: VerificationKind;
  note?: string | null;
  source?: "profile" | "application";
  sourceApplicationId?: string | null;
}) {
  const student = await prisma.student.findUnique({
    where: { id: args.studentId },
    select: { id: true, firstName: true, lastName: true, grade: true },
  });
  if (!student) throw new ScopeError("Student not found.", 404);
  if (args.kind === "displacement" && student.grade && !isK12(student.grade)) {
    throw new ScopeError("Displaced status applies to students in Kindergarten through 12th grade only.", 400);
  }

  const schoolYear = args.kind === "displacement" ? DISPLACED_SCOPE : await currentSchoolYear(student.id);
  const open = await prisma.studentVerification.findFirst({
    where: { studentId: student.id, kind: args.kind, schoolYear, status: { in: ["pending_review", "awaiting_dcs", "info_requested", "approved"] } },
  });
  if (open) return open;

  const verification = await prisma.studentVerification.create({
    data: {
      studentId: student.id,
      kind: args.kind,
      schoolYear,
      source: args.source ?? "profile",
      sourceApplicationId: args.sourceApplicationId ?? null,
      requestedBy: args.parentId,
      parentNote: args.note?.trim() || null,
    },
  });
  await log(verification.id, "submit", { id: args.parentId, email: args.parentEmail }, { parentMessage: args.note });
  await setFlag({
    studentId: student.id,
    flag: args.kind === "disability" ? "disabled" : "displaced",
    schoolYear,
    status: "pending_review",
    source: "verification",
    actor: { id: args.parentId, email: args.parentEmail },
    verificationId: verification.id,
    reason: "Waiting for review.",
  });

  const name = [student.firstName, student.lastName].filter(Boolean).join(" ");
  await tellParent(verification.id, `We received your ${VERIFICATION_LABEL[args.kind].toLowerCase()} request`, [
    `We've received your request to verify ${student.firstName}'s ${args.kind === "disability" ? "disability" : "displaced status"}. It's now under review.`,
    args.kind === "displacement"
      ? "We confirm placement history with the Arizona Department of Child Safety using the signed verification form. Please don't send court documents, case files or emails with caseworkers."
      : "If you haven't yet, upload the student's MET, IEP or 504 plan from the student's page.",
  ]);
  await tellStaff(verification.id, args.kind, name);
  return verification;
}

export type VerificationDecision =
  | { action: "claim" }
  | { action: "send_to_dcs"; dcsReference?: string | null; internalNote?: string | null }
  | { action: "approve"; documentSummary: string; dcsReference?: string | null; internalNote?: string | null }
  | { action: "deny"; parentMessage: string; internalNote?: string | null }
  | { action: "request_info"; parentMessage: string; internalNote?: string | null }
  | { action: "note"; internalNote: string };

/** A reviewer acts on a verification. Only approval makes the student eligible. */
export async function decideVerification(actor: StaffActor, verificationId: string, decision: VerificationDecision) {
  const v = await prisma.studentVerification.findUnique({
    where: { id: verificationId },
    include: { student: { select: { firstName: true } } },
  });
  if (!v) throw new ScopeError("Verification not found.", 404);
  const who = { id: actor.profileId, email: actor.email };
  const flag = v.kind === "disability" ? "disabled" : "displaced";
  const closed = v.status === "approved" || v.status === "denied" || v.status === "withdrawn";

  switch (decision.action) {
    case "claim":
      if (v.claimedBy && v.claimedBy !== actor.profileId) throw new ScopeError("Another reviewer already has this one.", 409);
      await prisma.studentVerification.update({ where: { id: v.id }, data: { claimedBy: actor.profileId, claimedAt: new Date() } });
      await log(v.id, "claim", who);
      return;
    case "note":
      if (!decision.internalNote?.trim()) throw new ScopeError("Write something first.", 400);
      await log(v.id, "note", who, { internalNote: decision.internalNote });
      return;
    case "send_to_dcs":
      if (v.kind !== "displacement") throw new ScopeError("Only displacement is verified with DCS.", 400);
      if (closed) throw new ScopeError("This verification is already decided.", 409);
      await prisma.studentVerification.update({
        where: { id: v.id },
        data: { status: "awaiting_dcs", dcsSentAt: new Date(), dcsReference: decision.dcsReference?.trim() || v.dcsReference },
      });
      await log(v.id, "send_to_dcs", who, { internalNote: decision.internalNote });
      await setFlag({ studentId: v.studentId, flag, schoolYear: v.schoolYear, status: "awaiting_dcs", source: "verification", actor: who, verificationId: v.id, reason: "Sent to DCS for confirmation." });
      return;
    case "request_info":
      if (!decision.parentMessage?.trim()) throw new ScopeError("Tell the family what you need.", 400);
      if (closed) throw new ScopeError("This verification is already decided.", 409);
      await prisma.studentVerification.update({ where: { id: v.id }, data: { status: "info_requested", parentMessage: decision.parentMessage.trim() } });
      await log(v.id, "request_info", who, { parentMessage: decision.parentMessage, internalNote: decision.internalNote });
      await setFlag({ studentId: v.studentId, flag, schoolYear: v.schoolYear, status: "info_requested", source: "verification", actor: who, verificationId: v.id, reason: decision.parentMessage });
      await tellParent(v.id, "We need a little more information", [decision.parentMessage.trim()]);
      return;
    case "deny":
      if (!decision.parentMessage?.trim()) throw new ScopeError("A denial needs a message to the family explaining why.", 400);
      await prisma.studentVerification.update({
        where: { id: v.id },
        data: { status: "denied", decidedBy: actor.profileId, decidedAt: new Date(), parentMessage: decision.parentMessage.trim() },
      });
      await log(v.id, "deny", who, { parentMessage: decision.parentMessage, internalNote: decision.internalNote });
      await setFlag({ studentId: v.studentId, flag, schoolYear: v.schoolYear, status: "denied", source: "verification", actor: who, verificationId: v.id, reason: decision.parentMessage });
      await tellParent(v.id, `${VERIFICATION_LABEL[v.kind as VerificationKind]}: not approved`, [decision.parentMessage.trim()]);
      return;
    case "approve": {
      if (!decision.documentSummary?.trim()) {
        throw new ScopeError("Record what the document showed (for displacement, the DCS confirmation).", 400);
      }
      if (v.kind === "displacement" && !v.dcsSentAt && !decision.dcsReference?.trim()) {
        throw new ScopeError("Displacement is approved on DCS confirmation. Mark it sent to DCS, or enter the DCS reference.", 400);
      }
      const doc = await prisma.applicationDocument.findFirst({
        where: { verificationId: v.id, purgedAt: null },
        orderBy: { uploadedAt: "desc" },
        select: { id: true },
      });
      await prisma.studentVerification.update({
        where: { id: v.id },
        data: {
          status: "approved",
          decidedBy: actor.profileId,
          decidedAt: new Date(),
          documentSummary: decision.documentSummary.trim(),
          dcsReference: decision.dcsReference?.trim() || v.dcsReference,
        },
      });
      await log(v.id, "approve", who, { internalNote: decision.internalNote });
      await setFlag({
        studentId: v.studentId,
        flag,
        schoolYear: v.schoolYear,
        status: "approved",
        source: "verification",
        actor: who,
        verificationId: v.id,
        documentId: doc?.id ?? null,
        reason: null,
        details: { documentSummary: decision.documentSummary.trim(), dcsReference: decision.dcsReference ?? v.dcsReference },
      });
      await tellParent(v.id, `${VERIFICATION_LABEL[v.kind as VerificationKind]} approved`, [
        v.kind === "displacement"
          ? `${v.student.firstName}'s displaced status is confirmed. It lasts through 12th grade, so you won't need to verify it again; just reapply for the scholarship each school year.`
          : `${v.student.firstName}'s disability is verified for ${v.schoolYear}.`,
      ]);
      return;
    }
  }
}

/** When an application says the student is displaced, open the DCS verification. */
export async function ensureDisplacementFromApplication(applicationId: string, parent: { profileId: string; email: string }) {
  const app = await prisma.scholarshipApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, studentId: true, isDisplaced: true, grade: true, documents: { where: { documentKind: "displaced_form", purgedAt: null }, select: { id: true } } },
  });
  if (!app || app.isDisplaced !== "yes" || !isK12(app.grade)) return null;
  const approved = await prisma.studentEligibilityFlag.findUnique({
    where: { studentId_flag_schoolYear: { studentId: app.studentId, flag: "displaced", schoolYear: DISPLACED_SCOPE } },
  });
  if (approved?.status === "approved") return null; // verified once, for all of K-12
  const verification = await requestVerification({
    parentId: parent.profileId,
    parentEmail: parent.email,
    studentId: app.studentId,
    kind: "displacement",
    source: "application",
    sourceApplicationId: app.id,
  });
  // The signed form uploaded with the application belongs to the verification too.
  if (app.documents.length) {
    await prisma.applicationDocument.updateMany({
      where: { id: { in: app.documents.map((d) => d.id) } },
      data: { verificationId: verification.id },
    });
  }
  return verification;
}
