import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

function dt(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
}

async function getForms() {
  return prisma.emailThread.findMany({
    where: {
      channel: "email",
      OR: [
        { subject: { contains: "form", mode: "insensitive" } },
        { subject: { contains: "contact", mode: "insensitive" } },
        { subject: { contains: "newsletter", mode: "insensitive" } },
      ],
    },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    select: { id: true, subject: true, fromName: true, fromEmail: true, unread: true, lastMessageAt: true },
  });
}

export async function EmailFormSubmissions() {
  const rows = await getForms();
  return (
    <Card className="border-border/80">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-heading text-base font-semibold text-primary">Form submissions</p>
            <p className="text-sm text-muted-foreground">Website contact &amp; newsletter forms that arrived by email.</p>
          </div>
          <Link href="/dashboard/admin/email?tab=inbox" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
            Open inbox <ArrowRight className="ml-0.5 size-3.5" />
          </Link>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Inbox className="mx-auto mb-2 size-6 opacity-50" />
            No form submissions found yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">From</th>
                  <th className="px-3 py-2 font-semibold">Subject</th>
                  <th className="px-3 py-2 font-semibold">Received</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <p className="font-medium text-foreground">{r.fromName ?? r.fromEmail ?? "Unknown"}</p>
                      {r.fromEmail ? <p className="text-xs text-muted-foreground">{r.fromEmail}</p> : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.subject ?? "(No subject)"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{dt(r.lastMessageAt)}</td>
                    <td className="px-3 py-2">{r.unread ? <Badge variant="secondary">Unread</Badge> : <Badge variant="outline">Read</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
