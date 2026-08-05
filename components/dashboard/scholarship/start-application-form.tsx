"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WizardStudent } from "@/components/dashboard/scholarship/types";

export function StartApplicationForm({
  students,
  schoolYears,
  defaultSchoolYear,
  allStudentsApplied,
}: {
  students: WizardStudent[];
  schoolYears: string[];
  defaultSchoolYear: string;
  allStudentsApplied: boolean;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [schoolYear, setSchoolYear] = useState(defaultSchoolYear);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (allStudentsApplied) {
    return (
      <Card className="border-border/80">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Every student on your account already has an application for {defaultSchoolYear}. Open one
          above to keep working on it.
        </CardContent>
      </Card>
    );
  }

  if (students.length === 0) return null;

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/scholarship/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, schoolYear }),
      });
      const data = (await res.json().catch(() => null)) as
        | { redirect?: string; error?: string }
        | null;
      if (!res.ok || !data?.redirect) {
        throw new Error(data?.error ?? "Could not start this application.");
      }
      router.push(data.redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start this application.");
      setStarting(false);
    }
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-primary">Start a new application</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="start-student">Student</Label>
            <Select value={studentId} onValueChange={(v) => setStudentId(v ?? "")}>
              <SelectTrigger id="start-student" className="mt-1.5 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="start-year">School year</Label>
            <Select value={schoolYear} onValueChange={(v) => setSchoolYear(v ?? defaultSchoolYear)}>
              <SelectTrigger id="start-year" className="mt-1.5 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {schoolYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="button" className="gap-2" onClick={() => void start()} disabled={starting || !studentId}>
          {starting ? "Starting…" : "Start application"}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </CardContent>
    </Card>
  );
}
