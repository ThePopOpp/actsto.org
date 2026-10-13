import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Give students with no school the school their family already told us:
 * the most recently saved application that names one, otherwise a campaign
 * they are on that names one. A student who already has a school is never
 * changed here; staff do that by hand.
 *
 * A student added from the Students page had no school field at all, so the
 * only source was an application or campaign. School merges and "link typed
 * name" moved applications but left these students empty, which is how a
 * student showed "No school" next to an application at a real school.
 *
 * Pass `studentIds` to limit it to those students. Returns the number filled.
 */
export async function fillMissingStudentSchools(db: Db = prisma, studentIds?: string[]): Promise<number> {
  if (studentIds && studentIds.length === 0) return 0;
  const only = studentIds ? Prisma.sql`AND s."id" = ANY(${studentIds}::uuid[])` : Prisma.empty;

  const fromApplications = await db.$executeRaw`
    UPDATE "students" s
       SET "school_id" = latest."school_id", "updated_at" = now()
      FROM (
        SELECT DISTINCT ON (a."student_id") a."student_id", a."school_id"
          FROM "scholarship_applications" a
          JOIN "schools" sc ON sc."id" = a."school_id" AND sc."status" <> 'archived'
         WHERE a."school_id" IS NOT NULL
         ORDER BY a."student_id", a."updated_at" DESC
      ) latest
     WHERE s."id" = latest."student_id"
       AND s."school_id" IS NULL
       ${only}`;

  const fromCampaigns = await db.$executeRaw`
    UPDATE "students" s
       SET "school_id" = latest."school_id", "updated_at" = now()
      FROM (
        SELECT DISTINCT ON (cs."student_id") cs."student_id", c."school_id"
          FROM "campaign_students" cs
          JOIN "campaigns" c ON c."id" = cs."campaign_id"
          JOIN "schools" sc ON sc."id" = c."school_id" AND sc."status" <> 'archived'
         WHERE c."school_id" IS NOT NULL
         ORDER BY cs."student_id", c."updated_at" DESC
      ) latest
     WHERE s."id" = latest."student_id"
       AND s."school_id" IS NULL
       ${only}`;

  return fromApplications + fromCampaigns;
}
