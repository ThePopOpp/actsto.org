import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

function dt(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
}
function statusBadge(status: string | null) {
  if (status === "sent") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Sent</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="outline">{status ?? "—"}</Badge>;
}

export async function EmailHistory() {
  const logs = await prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <Card className="border-border/80">
      <CardContent className="p-4">
        <p className="mb-3 font-heading text-base font-semibold text-primary">Send history</p>
        {logs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No emails sent yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">To</th>
                  <th className="px-3 py-2 font-semibold">Subject</th>
                  <th className="px-3 py-2 font-semibold">Template</th>
                  <th className="px-3 py-2 font-semibold">Provider</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 text-muted-foreground">{dt(l.createdAt)}</td>
                    <td className="px-3 py-2 text-foreground">{l.toEmail}</td>
                    <td className="max-w-[220px] truncate px-3 py-2 text-muted-foreground">{l.subject ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{l.templateKey ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">{l.provider ?? "—"}</td>
                    <td className="px-3 py-2">{statusBadge(l.status)}</td>
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
