"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decisionApprovalError, normalizeCommittee, type CommitteeApproval } from "@/lib/award-policy/decisions";
import { formatDate } from "@/lib/format-date";

export type QueuedDecision = {
  id: string;
  studentId: string;
  studentName: string;
  fundingLabel: string;
  total: number;
  campaigns: string[];
  createdAt: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
};

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

/**
 * Awards waiting on the committee for the school year. Reviewed awards can be
 * approved together, as allocated, with one meeting date, vote and recusals:
 * a committee meeting usually approves a batch. Reversed awards never appear.
 */
export function CommitteeApprovals({
  year,
  queue,
  reviewerMustDiffer,
  onOpen,
  onChanged,
}: {
  year: string;
  queue: QueuedDecision[];
  reviewerMustDiffer: boolean;
  onOpen: (studentId: string, decisionId: string) => void;
  onChanged: () => void;
}) {
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [committee, setCommittee] = useState<CommitteeApproval>({ round: "", meetingDate: "", vote: "", recusals: [] });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const reviewed = queue.filter((q) => q.reviewedAt);
  const chosen = reviewed.filter((q) => picked[q.id]);
  const problem = decisionApprovalError({ reviewed: true, committee: normalizeCommittee(committee) });
  const setC = (patch: Partial<CommitteeApproval>) => setCommittee((c) => ({ ...c, ...patch }));

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/allocation/student-policy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { error?: string; results?: { id: string; ok: boolean; error?: string }[] } | null;
    setBusy(false);
    return { res, data };
  }

  async function approve() {
    const { res, data } = await post({ action: "decision_bulk_approve", decisionIds: chosen.map((c) => c.id), committee });
    if (!res.ok) return setMessage({ ok: false, text: data?.error ?? "Not approved." });
    const failed = (data?.results ?? []).filter((r) => !r.ok);
    const approved = (data?.results ?? []).length - failed.length;
    setMessage({
      ok: failed.length === 0,
      text: `${approved} award(s) approved as allocated; the families have been sent their notices.${
        failed.length ? ` Not approved: ${failed.map((f) => `${queue.find((q) => q.id === f.id)?.studentName ?? f.id} (${f.error})`).join("; ")}` : ""
      }`,
    });
    setPicked({});
    onChanged();
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-primary">Committee approval · {year || "—"}</CardTitle>
        <CardDescription>
          Each award is reviewed once (Mark reviewed, on the student&apos;s award card), then the committee approves it as allocated or
          it is reversed and reallocated. Nothing is sent to a school before approval. Approve a meeting&apos;s reviewed awards together
          here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {queue.length === 0 ? (
          <p className="text-muted-foreground">Every award for {year || "this year"} is approved.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {queue.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4"
                    disabled={!q.reviewedAt}
                    checked={Boolean(picked[q.id])}
                    onChange={(e) => setPicked({ ...picked, [q.id]: e.target.checked })}
                    aria-label={`Approve ${q.studentName}`}
                  />
                  <span className="min-w-0">
                    <span className="font-medium text-foreground">{q.studentName}</span>{" "}
                    <span className="text-muted-foreground">
                      · {q.fundingLabel} · {usd(q.total)} · {q.campaigns.join(" + ")} · allocated {formatDate(q.createdAt)}
                    </span>
                  </span>
                </label>
                <span className="flex items-center gap-2">
                  {q.reviewedAt ? (
                    <Badge variant="outline" className="border-sky-500/50 text-sky-700 dark:text-sky-400">
                      Reviewed by {q.reviewedByName ?? "staff"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                      Needs review
                    </Badge>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={() => onOpen(q.studentId, q.id)}>
                    Open
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {reviewed.length ? (
          <div className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-foreground">Approve {chosen.length || "the chosen"} reviewed award(s) as allocated</p>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPicked(Object.fromEntries(reviewed.map((q) => [q.id, true])))}>
                Choose all reviewed ({reviewed.length})
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Meeting date</Label>
                <Input type="date" className="mt-1" value={committee.meetingDate} onChange={(e) => setC({ meetingDate: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Vote result</Label>
                <Input className="mt-1" placeholder="e.g. 4-0" value={committee.vote} onChange={(e) => setC({ vote: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Award round (optional)</Label>
                <Input
                  className="mt-1"
                  placeholder={committee.meetingDate ? `Committee ${committee.meetingDate}` : "Defaults to the meeting date"}
                  value={committee.round}
                  onChange={(e) => setC({ round: e.target.value })}
                />
              </div>
            </div>
            {committee.recusals.map((rec, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-center">
                <Input aria-label="Recused member" placeholder="Member" value={rec.member} onChange={(e) => setC({ recusals: committee.recusals.map((x, j) => (j === i ? { ...x, member: e.target.value } : x)) })} />
                <Input aria-label="Reason for recusal" placeholder="Reason" value={rec.reason} onChange={(e) => setC({ recusals: committee.recusals.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)) })} />
                <Button type="button" variant="ghost" size="sm" aria-label="Remove recusal" onClick={() => setC({ recusals: committee.recusals.filter((_, j) => j !== i) })}>
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setC({ recusals: [...committee.recusals, { member: "", reason: "" }] })}>
                <Plus className="mr-1 size-3.5" /> Add a recusal
              </Button>
              <Button type="button" size="sm" disabled={busy || chosen.length === 0 || Boolean(problem)} onClick={() => void approve()}>
                {busy ? "Approving…" : `Approve ${chosen.length} as allocated`}
              </Button>
              {chosen.length && problem ? <span className="text-xs text-muted-foreground">{problem}</span> : null}
            </div>
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="size-4"
            checked={reviewerMustDiffer}
            disabled={busy}
            onChange={(e) =>
              void (async () => {
                const { res, data } = await post({ action: "decision_settings", reviewerMustDifferFromAllocator: e.target.checked });
                if (!res.ok) setMessage({ ok: false, text: data?.error ?? "Not saved." });
                onChanged();
              })()
            }
          />
          The reviewer must be someone other than the person who allocated the award (off by default)
        </label>

        {message ? (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
            {message.text}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
