"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type SchoolOption = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
};

type StudentPayload = {
  profile: {
    email: string;
    phone: string | null;
  } | null;
  student: {
    firstName: string;
    lastName: string | null;
    nickname: string | null;
    grade: string | null;
    schoolId: string | null;
    birthDate: string | null;
    ageVerified: boolean;
    bio: string | null;
    profilePhotoUrl: string | null;
    status: string;
  };
  schools: SchoolOption[];
};

const GRADE_OPTIONS = [
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
];

const NO_SCHOOL = "__none__";

export function StudentProfileEditor() {
  const [payload, setPayload] = useState<StudentPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    phone: "",
    grade: "",
    schoolId: "",
    bio: "",
    profilePhotoUrl: "",
  });

  useEffect(() => {
    async function load() {
      setLoadError(null);
      try {
        const res = await fetch("/api/auth/student-profile");
        const data = (await res.json().catch(() => null)) as StudentPayload & { error?: string };
        if (!res.ok) throw new Error(data?.error ?? "Could not load student profile.");
        setPayload(data);
        setForm({
          firstName: data.student.firstName ?? "",
          lastName: data.student.lastName ?? "",
          nickname: data.student.nickname ?? "",
          phone: data.profile?.phone ?? "",
          grade: data.student.grade ?? "",
          schoolId: data.student.schoolId ?? "",
          bio: data.student.bio ?? "",
          profilePhotoUrl: data.student.profilePhotoUrl ?? "",
        });
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load student profile.");
      }
    }
    void load();
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(null);
    setSaveError(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSaveError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/auth/student-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not save student profile.");
      setSaved("Student profile saved.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save student profile.");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{loadError}</p>;
  }

  if (!payload) {
    return <p className="text-sm text-muted-foreground">Loading student profile...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wide text-act-red uppercase">Student account</p>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-primary sm:text-3xl">
          Student Profile
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Students 16+ can manage their own profile. Parent/guardian approval is still required for younger students and sensitive campaign changes.
        </p>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-primary">
            <GraduationCap className="size-5" />
            Profile basics
          </CardTitle>
          <CardDescription>
            School and grade feed the Student account completion meter and future campaign/profile connections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={save}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="student-first">First name</Label>
                <Input id="student-first" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-last">Last name</Label>
                <Input id="student-last" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-nickname">Nickname</Label>
                <Input id="student-nickname" value={form.nickname} onChange={(event) => update("nickname", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-phone">Phone</Label>
                <Input id="student-phone" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="student-grade">Grade level</Label>
                <Select value={form.grade || undefined} onValueChange={(value) => update("grade", value ?? "")}>
                  <SelectTrigger id="student-grade">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-school">School</Label>
                <Select
                  value={form.schoolId || NO_SCHOOL}
                  onValueChange={(value) => update("schoolId", value === NO_SCHOOL ? "" : (value ?? ""))}
                >
                  <SelectTrigger id="student-school">
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SCHOOL}>Select school</SelectItem>
                    {payload.schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                        {school.city ? ` · ${school.city}${school.state ? `, ${school.state}` : ""}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-photo">Profile photo URL</Label>
              <Input
                id="student-photo"
                value={form.profilePhotoUrl}
                onChange={(event) => update("profilePhotoUrl", event.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-bio">Bio</Label>
              <Textarea
                id="student-bio"
                className="min-h-[140px]"
                value={form.bio}
                onChange={(event) => update("bio", event.target.value)}
                placeholder="Share a short introduction for your ACT profile."
              />
            </div>

            {saveError ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{saveError}</p> : null}
            {saved ? <p className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-primary">{saved}</p> : null}

            <Button type="submit" disabled={busy}>
              <Save className="mr-2 size-4" />
              {busy ? "Saving..." : "Save Student Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
