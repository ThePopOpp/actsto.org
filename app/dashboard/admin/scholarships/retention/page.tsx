import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { HoldToggle } from "@/components/dashboard/admin/eligibility/hold-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatWindowDate } from "@/lib/scholarship/windows";
import { formatDate } from "@/lib/format-date";

export const dynamic = "force-dynamic";

/**
 * The retention schedule as data: which files are due to be deleted, which are
 * on hold, and what the purge job has deleted. Files are kept at least four
 * years after the annual report for their award year is due (ADOR), displaced
 * forms four years after the student's final payout year.
 */
export default async function RetentionPage() {
  const now = new Date();
  const inOneYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  const [upcoming, held, undated, purged] = await Promise.all([
    prisma.applicationDocument.findMany({
      where: { purgedAt: null, legalHold: false, purgeAfter: { not: null, lte: inOneYear } },
      orderBy: { purgeAfter: "asc" },
      take: 200,
      select: {
        id: true,
        fileName: true,
        documentKind: true,
        purgeAfter: true,
        application: { select: { schoolYear: true, student: { select: { firstName: true, lastName: true } } } },
        verification: { select: { kind: true, student: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.applicationDocument.findMany({
      where: { purgedAt: null, legalHold: true },
      orderBy: { uploadedAt: "desc" },
      select: { id: true, fileName: true, legalHoldReason: true, purgeAfter: true },
    }),
    prisma.applicationDocument.count({ where: { purgedAt: null, purgeAfter: null } }),
    prisma.documentAccessLog.findMany({
      where: { action: "purge" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { createdAt: true, document: { select: { fileName: true, documentKind: true } } },
    }),
  ]);

  const owner = (d: (typeof upcoming)[number]) => {
    const s = d.application?.student ?? d.verification?.student;
    return s ? [s.firstName, s.lastName].filter(Boolean).join(" ") : "—";
  };

  return (
    <>
      <AdminPageHeader
        title="Records retention"
        description="Supporting documents are kept at least four years after the September 30 annual report for their award year, then securely deleted by a scheduled job. Displaced-student forms are kept four years after the final payout year. The review record is always kept."
      />
      <div className="space-y-6">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-primary">Due for deletion in the next 12 months</CardTitle>
            <CardDescription>
              Place a hold to keep a file during an audit or dispute.{" "}
              {`${undated} displaced-student ${undated === 1 ? "file has" : "files have"} no date yet because the final payout year isn't known.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is due in the next year.</p>
            ) : (
              <ul className="divide-y divide-border/60 text-sm">
                {upcoming.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <span>
                      <span className="font-medium text-foreground">{d.fileName}</span>{" "}
                      <span className="text-muted-foreground">
                        · {owner(d)} · {d.documentKind}
                        {d.application?.schoolYear ? ` · ${d.application.schoolYear}` : ""} · deletes{" "}
                        {d.purgeAfter ? formatWindowDate(d.purgeAfter) : "—"}
                      </span>
                    </span>
                    <HoldToggle documentId={d.id} held={false} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-primary">On hold</CardTitle>
          </CardHeader>
          <CardContent>
            {held.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files are on hold.</p>
            ) : (
              <ul className="divide-y divide-border/60 text-sm">
                {held.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <span>
                      <span className="font-medium text-foreground">{d.fileName}</span>{" "}
                      <Badge variant="outline">Hold</Badge>{" "}
                      <span className="text-muted-foreground">{d.legalHoldReason}</span>
                    </span>
                    <HoldToggle documentId={d.id} held />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-primary">Deleted by the purge job</CardTitle>
            <CardDescription>The file is gone; the row and its review record remain as the audit trail.</CardDescription>
          </CardHeader>
          <CardContent>
            {purged.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing has been purged yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {purged.map((p, i) => (
                  <li key={i} className="text-muted-foreground">
                    {formatDate(p.createdAt)} · {p.document.fileName} ({p.document.documentKind})
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
