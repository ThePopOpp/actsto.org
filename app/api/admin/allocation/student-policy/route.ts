import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { AllocationError, recordPaymentReturn, releaseUnsent } from "@/lib/allocation/server";
import { approveDecision, saveDecision } from "@/lib/award-policy/decisions-server";
import { isOtherStoProgram } from "@/lib/award-policy/limits";
import { addToWaitingList, removeFromWaitingList } from "@/lib/award-policy/priority-server";
import { logAdminActivity } from "@/lib/admin/audit";
import { arizonaDateToInstant } from "@/lib/format-date";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown> & { action?: string };
const text = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const year = (v: unknown) => (typeof v === "string" && /^\d{4}\/\d{4}$/.test(v) ? v : null);

/**
 * POST /api/admin/allocation/student-policy — { action, ... }
 *
 * The award-policy records on one student, each audit logged:
 *   set_esa, save_other_sto, delete_other_sto, dd_override, waiting_list_add,
 *   waiting_list_remove, payment_return, release_unsent, decision_save,
 *   decision_approve.
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const actor = auth.actor;
  const body = ((await request.json().catch(() => null)) ?? {}) as Body;

  try {
    switch (body.action) {
      case "set_esa": {
        const studentId = text(body.studentId, 40);
        const schoolYear = year(body.schoolYear);
        const status = text(body.status, 10);
        const reason = text(body.reason, 1000);
        if (!studentId || !schoolYear) throw new AllocationError("Choose the student and school year.");
        if (!["none", "active", "closed"].includes(status)) throw new AllocationError("Choose an ESA status.");
        if (!reason) throw new AllocationError("Record why the ESA status is changing.");
        const closedOn = status === "closed" ? arizonaDateToInstant(text(body.closedOn, 10)) : null;
        if (status === "closed" && !closedOn) throw new AllocationError("Enter the date the ESA closed.");
        const closureDocumentId = text(body.closureDocumentId, 40) || null;
        const before = await prisma.studentEsaStatus.findUnique({ where: { studentId_schoolYear: { studentId, schoolYear } } });
        const data = {
          status,
          closedOn: closedOn ? new Date(`${text(body.closedOn, 10)}T00:00:00Z`) : null,
          closureDocumentId,
          note: reason,
          source: "admin",
          updatedBy: actor.id,
          updatedByEmail: actor.email,
        };
        await prisma.studentEsaStatus.upsert({
          where: { studentId_schoolYear: { studentId, schoolYear } },
          create: { studentId, schoolYear, ...data },
          update: data,
        });
        await logAdminActivity({
          actorId: actor.id,
          actorEmail: actor.email,
          action: "esa.set_status",
          entityType: "student",
          entityId: studentId,
          before: before ? { status: before.status, closedOn: before.closedOn } : null,
          after: { schoolYear, status, closedOn: text(body.closedOn, 10) || null, reason },
        });
        break;
      }
      case "save_other_sto": {
        const studentId = text(body.studentId, 40);
        const schoolYear = year(body.schoolYear);
        const stoName = text(body.stoName, 160);
        const program = text(body.program, 40) || "unknown";
        const amount = Number(String(body.amount ?? "").replace(/[$,\s]/g, ""));
        if (!studentId || !schoolYear) throw new AllocationError("Choose the student and school year.");
        if (!stoName) throw new AllocationError("Enter the other STO's name.");
        if (!isOtherStoProgram(program)) throw new AllocationError("Choose the program.");
        if (!Number.isFinite(amount) || amount < 0) throw new AllocationError("Enter the amount.");
        const data = {
          stoName,
          program,
          amount: Math.round(amount * 100) / 100,
          note: text(body.note, 1000) || null,
          updatedBy: actor.id,
          updatedByEmail: actor.email,
        };
        const id = text(body.id, 40);
        const before = id ? await prisma.otherStoScholarship.findUnique({ where: { id } }) : null;
        if (id && (!before || before.studentId !== studentId)) throw new AllocationError("That entry wasn't found.", 404);
        const saved = id
          ? await prisma.otherStoScholarship.update({ where: { id }, data })
          : await prisma.otherStoScholarship.create({ data: { ...data, studentId, schoolYear, source: "admin" } });
        await logAdminActivity({
          actorId: actor.id,
          actorEmail: actor.email,
          action: "other_sto.save",
          entityType: "student",
          entityId: studentId,
          before: before ? { stoName: before.stoName, program: before.program, amount: Number(before.amount) } : null,
          after: { id: saved.id, schoolYear, ...data },
        });
        break;
      }
      case "delete_other_sto": {
        const id = text(body.id, 40);
        const row = id ? await prisma.otherStoScholarship.findUnique({ where: { id } }) : null;
        if (!row) throw new AllocationError("That entry wasn't found.", 404);
        await prisma.otherStoScholarship.delete({ where: { id } });
        await logAdminActivity({
          actorId: actor.id,
          actorEmail: actor.email,
          action: "other_sto.delete",
          entityType: "student",
          entityId: row.studentId,
          before: { stoName: row.stoName, program: row.program, amount: Number(row.amount), schoolYear: row.schoolYear },
        });
        break;
      }
      case "dd_override": {
        const studentId = text(body.studentId, 40);
        const schoolYear = year(body.schoolYear);
        const reason = text(body.reason, 1000);
        if (!studentId || !schoolYear) throw new AllocationError("Choose the student and school year.");
        const clear = body.ddCap === null || body.ddCap === "";
        const ddCap = clear ? null : Number(String(body.ddCap).replace(/[$,\s]/g, ""));
        if (!clear && (!Number.isFinite(ddCap) || (ddCap ?? 0) < 0)) throw new AllocationError("Enter the cap as a dollar amount.");
        if (!clear && !reason) throw new AllocationError("An override needs a reason.");
        const before = await prisma.studentYearLimit.findUnique({ where: { studentId_schoolYear: { studentId, schoolYear } } });
        const data = {
          ddCap: clear ? null : Math.round((ddCap as number) * 100) / 100,
          ddCapReason: clear ? null : reason,
          ddCapIsOverride: !clear,
          updatedBy: actor.id,
          updatedByEmail: actor.email,
        };
        await prisma.studentYearLimit.upsert({
          where: { studentId_schoolYear: { studentId, schoolYear } },
          create: { studentId, schoolYear, ...data },
          update: data,
        });
        await logAdminActivity({
          actorId: actor.id,
          actorEmail: actor.email,
          action: clear ? "dd_cap.clear_override" : "dd_cap.override",
          entityType: "student",
          entityId: studentId,
          before: before ? { ddCap: before.ddCap === null ? null : Number(before.ddCap), reason: before.ddCapReason, override: before.ddCapIsOverride } : null,
          after: { schoolYear, ...data },
        });
        break;
      }
      case "waiting_list_add":
        await addToWaitingList(actor, text(body.studentId, 40), text(body.note, 1000));
        break;
      case "waiting_list_remove":
        await removeFromWaitingList(actor, text(body.studentId, 40));
        break;
      case "payment_return":
        await recordPaymentReturn(actor, text(body.paymentId, 40), {
          amount: Number(body.amount),
          returnedOn: text(body.returnedOn, 10),
          note: text(body.note, 1000),
        });
        break;
      case "release_unsent":
        await releaseUnsent(actor, text(body.awardId, 40), text(body.reason, 1000));
        break;
      case "decision_save":
        await saveDecision(actor, text(body.decisionId, 40), (body.record ?? {}) as Parameters<typeof saveDecision>[2]);
        break;
      case "decision_approve":
        await approveDecision(actor, text(body.decisionId, 40));
        break;
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}
