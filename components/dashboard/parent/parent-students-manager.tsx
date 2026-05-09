"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Link2, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export type ParentStudentRow = {
  id: string;
  name: string;
  grade: string | null;
  school: string | null;
  campaignSlug: string | null;
  birthDate: string | null;
  ageVerified: boolean;
  studentUserId: string | null;
  studentInviteEmail: string | null;
  studentInviteExpiresAt: string | null;
};

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

export function ParentStudentsManager({ students }: { students: ParentStudentRow[] }) {
  const [emails, setEmails] = useState<Record<string, string>>(() => {
    return Object.fromEntries(students.map((student) => [student.id, student.studentInviteEmail ?? ""]));
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [inviteById, setInviteById] = useState<Record<string, InviteResult>>({});

  const hasStudents = students.length > 0;
  const connectedCount = useMemo(
    () => students.filter((student) => Boolean(student.studentUserId)).length,
    [students],
  );

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
        <CardContent className="space-y-3 p-6">
          <h2 className="font-heading text-lg font-semibold text-primary">No linked students yet</h2>
          <p className="text-sm text-muted-foreground">
            Add students through the parent campaign flow first. Once a student is 16 or older, you
            can invite them to connect their own student login from this page.
          </p>
          <Link href="/campaigns/new" className={cn(buttonVariants({ size: "sm" }))}>
            Start a campaign
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary">{students.length} linked student{students.length === 1 ? "" : "s"}</Badge>
        <Badge variant="outline">{connectedCount} independent login{connectedCount === 1 ? "" : "s"}</Badge>
      </div>
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
                  <Badge variant="secondary">{student.grade ?? "Grade needed"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{student.school ?? "School needed"}</p>
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

                {student.campaignSlug ? (
                  <Link
                    href={`/dashboard/parent/campaigns/${student.campaignSlug}/edit`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    Manage campaign
                  </Link>
                ) : null}

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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
