"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Copy, Link2, Plus, Send, Trash2, UserPlus, X } from "lucide-react";

import { StudentHowToDialog } from "@/components/dashboard/parent/student-howto-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DuplicateGroup, ParentStudentPayload } from "@/lib/students/parent-students";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export type ParentStudentRow = ParentStudentPayload;

export type ParentCampaignRef = { id: string; slug: string; title: string };

type InviteResult = {
  token: string;
  inviteUrl: string;
  expiresAt: string;
};

function ageFromDate(date: string | null) {
  if (!date) return null;
  const birth = new Date(`${date}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function isInviteEligible(student: ParentStudentRow) {
  const age = ageFromDate(student.birthDate);
  return student.ageVerified || (age !== null && age >= 16);
}

/**
 * Add a child to the account on its own.
 *
 * This was previously a link into the four-step campaign wizard, so a parent
 * with a second kid had to start a campaign they did not want just to record
 * that child. A student can now exist first and join campaigns afterwards.
 */
function AddStudentForm({ onAdded }: { onAdded: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFirstName("");
    setLastName("");
    setGrade("");
    setBirthDate("");
    setError(null);
  }

  async function save() {
    if (!firstName.trim()) {
      setError("A first name is required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/parent/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, grade, birthDate }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not add this student.");
      reset();
      setIsOpen(false);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this student.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <Button type="button" size="sm" className="gap-1.5" onClick={() => setIsOpen(true)}>
        <UserPlus className="size-4" />
        Add a student
      </Button>
    );
  }

  return (
    <Card className="w-full border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-heading text-base text-primary">Add a student</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)} aria-label="Cancel">
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="new-student-first">First name</Label>
            <Input
              id="new-student-first"
              className="mt-1.5"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new-student-last">Last name</Label>
            <Input
              id="new-student-last"
              className="mt-1.5"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new-student-grade">Grade</Label>
            <Input
              id="new-student-grade"
              className="mt-1.5"
              placeholder="e.g. 5th Grade"
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new-student-dob">Date of birth (optional)</Label>
            <Input
              id="new-student-dob"
              type="date"
              className="mt-1.5"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Needed only to invite a student 16 or older to their own login.
            </p>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={isSaving} onClick={() => void save()}>
            {isSaving ? "Adding..." : "Add student"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Connect this student to another of the family's campaigns, or take them off one. */
function CampaignLinks({
  student,
  campaigns,
  onChanged,
}: {
  student: ParentStudentRow;
  campaigns: ParentCampaignRef[];
  onChanged: () => void;
}) {
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linkedSlugs = useMemo(
    () => new Set(student.campaigns.map((campaign) => campaign.slug)),
    [student.campaigns],
  );
  const available = campaigns.filter((campaign) => !linkedSlugs.has(campaign.slug));

  async function changeLink(slug: string, method: "POST" | "DELETE") {
    setPendingSlug(slug);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(slug)}/students`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not update this campaign.");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this campaign.");
    } finally {
      setPendingSlug(null);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/80 p-4">
      <p className="text-sm font-medium text-primary">Campaigns</p>

      {student.campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not on a campaign yet.</p>
      ) : (
        <ul className="space-y-2">
          {student.campaigns.map((campaign) => (
            <li key={campaign.slug} className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/dashboard/parent/campaigns/${campaign.slug}/edit`}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {campaign.title}
              </Link>
              <div className="flex items-center gap-2">
                <Badge variant={campaign.status === "draft" ? "outline" : "secondary"}>
                  {campaign.status === "draft" ? "Draft" : "Live"}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pendingSlug !== null}
                  onClick={() => void changeLink(campaign.slug, "DELETE")}
                >
                  {pendingSlug === campaign.slug ? "Removing..." : "Remove"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {available.map((campaign) => (
            <Button
              key={campaign.slug}
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={pendingSlug !== null}
              onClick={() => void changeLink(campaign.slug, "POST")}
            >
              <Plus className="size-3.5" />
              {pendingSlug === campaign.slug ? "Adding..." : `Add to ${campaign.title}`}
            </Button>
          ))}
        </div>
      ) : null}

      <Link href="/campaigns/new" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}>
        <Plus className="size-3.5" />
        Start a new campaign
      </Link>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

/**
 * Take a student off the account altogether.
 *
 * Two-press confirm, because unlike removing them from a campaign this deletes
 * the record. The server refuses when donations or scholarship history hang off
 * the student, and that reason is shown here rather than a generic failure.
 */
function RemoveStudentButton({ student, onRemoved }: { student: ParentStudentRow; onRemoved: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setIsRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/parent/students/${student.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not remove this student.");
      onRemoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this student.");
      setConfirming(false);
    } finally {
      setIsRemoving(false);
    }
  }

  if (!confirming) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          Remove from account
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-sm text-foreground/90">
        Remove <span className="font-medium">{student.name}</span> from your account? This deletes their
        record and takes them off
        {student.campaigns.length === 1
          ? " 1 campaign"
          : ` ${student.campaigns.length} campaigns`}
        . Donations already made are not affected.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="destructive" size="sm" disabled={isRemoving} onClick={() => void remove()}>
          {isRemoving ? "Removing..." : "Yes, remove"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

/**
 * Offer to fold repeated student records into one.
 *
 * Campaign creation used to store a fresh student for every campaign, so
 * families who started more than one campaign before that changed have the same
 * child listed twice. The parent chooses which record survives.
 */
function DuplicateBanner({
  groups,
  students,
  onMerged,
}: {
  groups: DuplicateGroup[];
  students: ParentStudentRow[];
  onMerged: () => void;
}) {
  const [keepByKey, setKeepByKey] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.map((group) => [group.key, group.studentIds[0]])),
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const byId = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);

  async function merge(group: DuplicateGroup) {
    const keepId = keepByKey[group.key] ?? group.studentIds[0];
    setPendingKey(group.key);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/parent/students/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepId, mergeIds: group.studentIds.filter((id) => id !== keepId) }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; keptBecauseProtected?: string[] }
        | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not merge these records.");
      if (data?.keptBecauseProtected?.length) {
        setNotice(
          "Campaigns were moved onto the record you kept. One or more duplicates had donation or scholarship history, so those records were left in place.",
        );
      }
      onMerged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not merge these records.");
    } finally {
      setPendingKey(null);
    }
  }

  if (groups.length === 0) return null;

  return (
    <Card className="border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-heading text-base text-amber-900 dark:text-amber-100">
          <Copy className="size-4" aria-hidden />
          The same student looks like it was entered twice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-amber-900 dark:text-amber-100">
        <p>
          Campaigns created before this account page existed saved a separate record each time. Merging
          keeps one record and moves every campaign onto it.
        </p>

        {groups.map((group) => {
          const keepId = keepByKey[group.key] ?? group.studentIds[0];
          return (
            <div key={group.key} className="space-y-2 rounded-lg border border-amber-300/60 bg-background/60 p-3">
              <p className="font-medium">{group.name}</p>
              <div className="space-y-1.5">
                {group.studentIds.map((id) => {
                  const student = byId.get(id);
                  const campaignCount = student?.campaigns.length ?? 0;
                  return (
                    <label key={id} className="flex items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name={`keep-${group.key}`}
                        value={id}
                        checked={keepId === id}
                        onChange={() => setKeepByKey((state) => ({ ...state, [group.key]: id }))}
                        className="mt-1"
                      />
                      <span>
                        Keep this one —{" "}
                        {[
                          student?.grade || "no grade",
                          student?.school || "no school",
                          `${campaignCount} campaign${campaignCount === 1 ? "" : "s"}`,
                          student?.studentUserId ? "has own login" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </label>
                  );
                })}
              </div>
              <Button
                type="button"
                size="sm"
                disabled={pendingKey !== null}
                onClick={() => void merge(group)}
              >
                {pendingKey === group.key ? "Merging..." : "Merge into the record I chose"}
              </Button>
            </div>
          );
        })}

        {notice ? <p>{notice}</p> : null}
        {error ? <p className="text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ParentStudentsManager({
  students,
  campaigns = [],
  duplicateGroups = [],
}: {
  students: ParentStudentRow[];
  campaigns?: ParentCampaignRef[];
  duplicateGroups?: DuplicateGroup[];
}) {
  const router = useRouter();
  const [emails, setEmails] = useState<Record<string, string>>(() =>
    Object.fromEntries(students.map((student) => [student.id, student.studentInviteEmail ?? ""])),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [inviteById, setInviteById] = useState<Record<string, InviteResult>>({});

  const hasStudents = students.length > 0;
  const connectedCount = useMemo(
    () => students.filter((student) => Boolean(student.studentUserId)).length,
    [students],
  );

  function refresh() {
    router.refresh();
  }

  async function createInvite(student: ParentStudentRow) {
    setPendingId(student.id);
    setErrorById((state) => ({ ...state, [student.id]: "" }));
    try {
      const res = await fetch(`/api/parent/students/${student.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emails[student.id] ?? "" }),
      });
      const data = (await res.json().catch(() => null)) as (InviteResult & { error?: string }) | null;
      if (!res.ok || !data || data.error) {
        throw new Error(data?.error ?? "Could not create student invite.");
      }
      setInviteById((state) => ({ ...state, [student.id]: data }));
    } catch (error) {
      setErrorById((state) => ({
        ...state,
        [student.id]: error instanceof Error ? error.message : "Could not create student invite.",
      }));
    } finally {
      setPendingId(null);
    }
  }

  if (!hasStudents) {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="space-y-4 p-6">
          <h2 className="font-heading text-lg font-semibold text-primary">No students yet</h2>
          <p className="text-sm text-muted-foreground">
            Add each of your children here. You can add them before you have a campaign, then connect
            them to one — or several — whenever you are ready.
          </p>
          <div className="flex flex-wrap gap-2">
            <AddStudentForm onAdded={refresh} />
            <Link href="/campaigns/new" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Start a campaign
            </Link>
            <StudentHowToDialog variant="ghost" label="Show me how" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">
            {students.length} student{students.length === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline">
            {connectedCount} independent login{connectedCount === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <StudentHowToDialog />
          <AddStudentForm onAdded={refresh} />
        </div>
      </div>

      <DuplicateBanner groups={duplicateGroups} students={students} onMerged={refresh} />

      <div className="grid gap-4 md:grid-cols-2">
        {students.map((student) => {
          const eligible = isInviteEligible(student);
          const connected = Boolean(student.studentUserId);
          const invite = inviteById[student.id];
          const error = errorById[student.id];
          return (
            <Card key={student.id} className="border-border/80">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-heading text-base text-primary">{student.name}</CardTitle>
                  <Badge variant="secondary">{student.grade || "Grade needed"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{student.school || "School needed"}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {connected ? (
                    <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                      <CheckCircle2 className="size-3.5" />
                      Student login connected
                    </Badge>
                  ) : eligible ? (
                    <Badge variant="outline">Eligible for student login</Badge>
                  ) : (
                    <Badge variant="secondary">Parent-managed only</Badge>
                  )}
                </div>

                <CampaignLinks student={student} campaigns={campaigns} onChanged={refresh} />

                {!connected ? (
                  <div className="space-y-3 rounded-lg border border-border/80 p-4">
                    <div>
                      <Label htmlFor={`student-email-${student.id}`}>Student email</Label>
                      <Input
                        id={`student-email-${student.id}`}
                        type="email"
                        value={emails[student.id] ?? ""}
                        onChange={(event) =>
                          setEmails((state) => ({ ...state, [student.id]: event.target.value }))
                        }
                        placeholder="student@example.com"
                        className="mt-1.5"
                        disabled={!eligible}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      disabled={!eligible || pendingId !== null}
                      onClick={() => void createInvite(student)}
                    >
                      <Send className="size-4" />
                      {pendingId === student.id ? "Creating..." : "Invite student login"}
                    </Button>
                    {!eligible ? (
                      <p className="text-xs text-muted-foreground">
                        Add or verify the student date of birth before inviting an independent login.
                      </p>
                    ) : null}
                    {error ? <p className="text-sm text-destructive">{error}</p> : null}
                    {invite ? (
                      <div className="space-y-2">
                        <Label htmlFor={`invite-url-${student.id}`} className="flex items-center gap-1">
                          <Link2 className="size-3.5" />
                          Invite link
                        </Label>
                        <Input id={`invite-url-${student.id}`} value={invite.inviteUrl} readOnly />
                        <p className="text-xs text-muted-foreground">
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <RemoveStudentButton student={student} onRemoved={refresh} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
