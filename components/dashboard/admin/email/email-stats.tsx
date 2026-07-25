import { CheckCircle2, FileText, Inbox, Mail, Send, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

async function getStats() {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [sent, failed, last30, templates, drafts, unread, threads, resend, smtp] = await Promise.all([
    prisma.emailLog.count({ where: { status: "sent" } }),
    prisma.emailLog.count({ where: { status: "failed" } }),
    prisma.emailLog.count({ where: { createdAt: { gte: since } } }),
    prisma.emailTemplate.count(),
    prisma.emailTemplate.count({ where: { status: "draft" } }).catch(() => 0),
    prisma.emailThread.count({ where: { channel: "email", unread: true } }),
    prisma.emailThread.count({ where: { channel: "email" } }),
    prisma.emailLog.count({ where: { provider: "resend" } }),
    prisma.emailLog.count({ where: { provider: "smtp" } }),
  ]);
  const attempted = sent + failed;
  const delivery = attempted > 0 ? Math.round((sent / attempted) * 100) : 100;
  return { sent, failed, last30, templates, drafts, unread, threads, resend, smtp, delivery };
}

export async function EmailStats() {
  const s = await getStats();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile icon={CheckCircle2} label="Delivery rate" value={`${s.delivery}%`} sub={`${s.sent} sent`} />
        <Tile icon={Send} label="Sent (30d)" value={s.last30} sub="Logged sends" />
        <Tile icon={XCircle} label="Failed" value={s.failed} sub="Send errors" alert={s.failed > 0} />
        <Tile icon={FileText} label="Templates" value={s.templates} sub={`${s.drafts} drafts`} />
        <Tile icon={Inbox} label="Unread inbox" value={s.unread} sub={`${s.threads} threads`} alert={s.unread > 0} />
        <Tile icon={Mail} label="Provider mix" value={s.resend >= s.smtp ? "Resend" : "SMTP"} sub={`${s.resend} · ${s.smtp}`} />
      </div>
      <Card className="border-border/80">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How email flows</p>
          <p className="mt-1">
            Outbound email sends through <strong>Resend</strong> when <code className="rounded bg-muted px-1">RESEND_API_KEY</code> is set,
            otherwise it falls back to <strong>SMTP</strong>. Inbound email syncs over <strong>IMAP</strong> into the Inbox tab. Every
            send is recorded in History.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ icon: Icon, label, value, sub, alert }: { icon: LucideIcon; label: string; value: string | number; sub?: string; alert?: boolean }) {
  return (
    <Card size="sm" className="p-3">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <Icon className={`size-3.5 shrink-0 ${alert ? "text-act-red" : "text-muted-foreground"}`} />
        </div>
        <p className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${alert ? "text-act-red" : "text-primary"}`}>{value}</p>
        {sub ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}
