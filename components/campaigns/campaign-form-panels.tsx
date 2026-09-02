"use client";

import { useRef, useState } from "react";
import { ImageUp, Plus, Trash2, UserPlus, X } from "lucide-react";

import { useFamilyStudents, type SavedStudent } from "@/components/campaigns/use-family-students";
import { Badge } from "@/components/ui/badge";

import type { CampaignFormValues } from "@/lib/dashboard/campaign-editor";
import { emptyCampaignFormStudent, getCampaignFormStudents } from "@/lib/dashboard/campaign-editor";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, FACE_SAFE_CROP, formatUsPhone, initialsOf } from "@/lib/utils";

type OnPatch = (patch: Partial<CampaignFormValues>) => void;

/**
 * Image upload with a preview of what's actually on the record.
 *
 * It previously reported "Uploaded 1 image." and showed nothing, so there was no
 * way to tell whether the right file had landed — or whether an image was on the
 * campaign at all. `value` is the URL currently saved; pass it and you see it.
 */
function CampaignImageUpload({
  label = "Click or drop files to upload",
  multiple = false,
  value,
  values,
  onUploaded,
  onClear,
  round = false,
  fallbackName,
}: {
  label?: string;
  multiple?: boolean;
  /** The single image currently on the record. */
  value?: string | null;
  /** Several images currently on the record, for gallery-style fields. */
  values?: string[];
  onUploaded: (urls: string[]) => void;
  onClear?: (url: string) => void;
  round?: boolean;
  /** Shown as initials when there's no image yet — e.g. the parent's name. */
  fallbackName?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const current = values ?? (value ? [value] : []);

  async function uploadFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;

    setIsUploading(true);
    setStatus("Uploading...");

    try {
      const uploaded: string[] = [];
      for (const file of images) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/campaign-media/upload", { method: "POST", body });
        const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
        if (!res.ok || !data?.url) {
          throw new Error(data?.error ?? "Upload failed.");
        }
        uploaded.push(data.url);
      }
      if (uploaded.length > 0) {
        onUploaded(uploaded);
        setStatus(`Uploaded ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setStatus(message);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {current.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {current.map((url) => (
            <figure key={url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className={cn(
                  "border border-border object-cover",
                  FACE_SAFE_CROP,
                  round ? "size-20 rounded-full" : "h-24 w-36 rounded-md",
                )}
              />
              {onClear ? (
                <button
                  type="button"
                  onClick={() => onClear(url)}
                  aria-label="Remove this image"
                  className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-destructive"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </figure>
          ))}
        </div>
      ) : fallbackName ? (
        // No photo yet — initials still identify who this is.
        <div className="mt-1.5 flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-20 place-items-center rounded-full bg-secondary text-lg font-semibold text-primary"
          >
            {initialsOf(fallbackName)}
          </span>
          <p className="text-xs text-muted-foreground">
            No photo yet — initials are shown until one is added.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        className="mt-1.5 flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          void uploadFiles(event.dataTransfer.files);
        }}
        disabled={isUploading}
      >
        <ImageUp className="size-5" aria-hidden />
        <span>{isUploading ? "Uploading..." : label}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          if (event.currentTarget.files) void uploadFiles(event.currentTarget.files);
        }}
      />
      {status ? <p className="mt-1 text-xs text-muted-foreground">{status}</p> : null}
    </div>
  );
}

export function CampaignFormPanelCampaign({
  values,
  onPatch,
}: {
  values: CampaignFormValues;
  onPatch: OnPatch;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="cf-title">Campaign title</Label>
        <Input
          id="cf-title"
          className="mt-1.5"
          value={values.title}
          onChange={(e) => onPatch({ title: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cf-desc">Detailed description</Label>
        <Textarea
          id="cf-desc"
          className="mt-1.5 min-h-[140px]"
          value={values.description}
          onChange={(e) => onPatch({ description: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cf-excerpt">Short excerpt (cards &amp; search)</Label>
        <Textarea
          id="cf-excerpt"
          className="mt-1.5 min-h-[88px]"
          value={values.excerpt}
          onChange={(e) => onPatch({ excerpt: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cf-tag">Tagline</Label>
        <Input
          id="cf-tag"
          className="mt-1.5"
          value={values.tagline}
          onChange={(e) => onPatch({ tagline: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cf-start">Campaign start date</Label>
          <DatePicker id="cf-start" value={values.startDate} onChange={(startDate) => onPatch({ startDate })} />
        </div>
        <div>
          <Label htmlFor="cf-end">Campaign end date</Label>
          <DatePicker id="cf-end" value={values.endDate} onChange={(endDate) => onPatch({ endDate })} />
        </div>
      </div>
      <div>
        <Label htmlFor="cf-goal">Financial goal</Label>
        <Input
          id="cf-goal"
          inputMode="decimal"
          placeholder="0.00"
          className="mt-1.5"
          value={values.goal}
          onChange={(e) => onPatch({ goal: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cf-hero">Featured image URL</Label>
        <Input
          id="cf-hero"
          className="mt-1.5 font-mono text-sm"
          value={values.image}
          onChange={(e) => onPatch({ image: e.target.value })}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Or use upload when storage is connected — same layout as campaign creation.
        </p>
        <CampaignImageUpload
          value={values.image}
          onClear={() => onPatch({ image: "" })}
          onUploaded={([image]) => image && onPatch({ image })}
        />
      </div>
      <div>
        <Label htmlFor="cf-gallery">Photo gallery (one URL per line)</Label>
        <Textarea
          id="cf-gallery"
          className="mt-1.5 min-h-[100px] font-mono text-sm"
          value={values.galleryText}
          onChange={(e) => onPatch({ galleryText: e.target.value })}
          placeholder="https://..."
        />
        <CampaignImageUpload
          multiple
          onUploaded={(urls) =>
            onPatch({
              galleryText: [values.galleryText, ...urls].filter(Boolean).join("\n"),
            })
          }
        />
      </div>
    </div>
  );
}

export function CampaignFormPanelParent({
  values,
  onPatch,
}: {
  values: CampaignFormValues;
  onPatch: OnPatch;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="cf-parent-name">Parent / guardian name</Label>
        <Input
          id="cf-parent-name"
          className="mt-1.5"
          value={values.parentName}
          onChange={(e) => onPatch({ parentName: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cf-parent-email">Email</Label>
        <Input
          id="cf-parent-email"
          type="email"
          className="mt-1.5"
          value={values.parentEmail}
          onChange={(e) => onPatch({ parentEmail: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cf-parent-phone">Phone</Label>
        <Input
          id="cf-parent-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(480) 555-0148"
          className="mt-1.5"
          value={formatUsPhone(values.parentPhone)}
          onChange={(e) => onPatch({ parentPhone: formatUsPhone(e.target.value) })}
        />
      </div>
      <div>
        <Label>Parent photo</Label>
        <CampaignImageUpload
          label="Click or drop parent photo to upload"
          value={values.parentPhoto}
          fallbackName={values.parentName}
          round
          onClear={() => onPatch({ parentPhoto: "" })}
          onUploaded={([parentPhoto]) => parentPhoto && onPatch({ parentPhoto })}
        />
      </div>
    </div>
  );
}

export function CampaignFormPanelStudent({
  values,
  onPatch,
  onSkip,
}: {
  values: CampaignFormValues;
  onPatch: OnPatch;
  onSkip?: () => void;
}) {
  const { students: savedStudents } = useFamilyStudents();
  const students = getCampaignFormStudents(values);
  const campaignGoal = Number.parseFloat(values.goal.replace(/,/g, ""));
  const defaultGoal =
    Number.isFinite(campaignGoal) && campaignGoal > 0
      ? String(Math.round(campaignGoal / Math.max(1, students.length || 1)))
      : "";

  function ensureStudentList() {
    return students.length > 0 ? students : [{ ...emptyCampaignFormStudent(), individualGoal: defaultGoal }];
  }

  function patchStudent(index: number, patch: Partial<(typeof students)[number]>) {
    const next = ensureStudentList();
    next[index] = { ...next[index], ...patch };
    onPatch({
      students: next,
      studentFirstName: next[0]?.firstName ?? "",
      studentLastName: next[0]?.lastName ?? "",
      studentNickname: next[0]?.nickname ?? "",
      studentGrade: next[0]?.grade ?? "",
      studentSchool: next[0]?.school ?? "",
      studentIndividualGoal: next[0]?.individualGoal ?? "",
      studentPhoto: next[0]?.photo ?? "",
    });
  }

  function addStudent() {
    const current = students.length > 0 ? students : [];
    const splitGoal =
      Number.isFinite(campaignGoal) && campaignGoal > 0
        ? String(Math.round(campaignGoal / Math.max(1, current.length + 1)))
        : "";
    const next = [
      ...current.map((student) => ({
        ...student,
        individualGoal: student.individualGoal || splitGoal,
      })),
      { ...emptyCampaignFormStudent(), individualGoal: splitGoal },
    ];
    onPatch({
      students: next,
      studentFirstName: next[0]?.firstName ?? "",
      studentLastName: next[0]?.lastName ?? "",
      studentNickname: next[0]?.nickname ?? "",
      studentGrade: next[0]?.grade ?? "",
      studentSchool: next[0]?.school ?? "",
      studentIndividualGoal: next[0]?.individualGoal ?? "",
      studentPhoto: next[0]?.photo ?? "",
    });
  }

  function removeStudent(index: number) {
    const next = ensureStudentList().filter((_, i) => i !== index);
    onPatch({
      students: next,
      studentFirstName: next[0]?.firstName ?? "",
      studentLastName: next[0]?.lastName ?? "",
      studentNickname: next[0]?.nickname ?? "",
      studentGrade: next[0]?.grade ?? "",
      studentSchool: next[0]?.school ?? "",
      studentIndividualGoal: next[0]?.individualGoal ?? "",
      studentPhoto: next[0]?.photo ?? "",
    });
  }

  function skipStudent() {
    onPatch({
      students: [],
      studentFirstName: "",
      studentLastName: "",
      studentNickname: "",
      studentGrade: "",
      studentSchool: "",
      studentIndividualGoal: "",
      studentIndividualRaised: "",
      studentPhoto: "",
    });
    onSkip?.();
  }

  function addSavedStudent(saved: SavedStudent) {
    const current = students.length > 0 ? students : [];
    if (current.some((student) => student.id && student.id === saved.id)) return;
    const splitGoal =
      Number.isFinite(campaignGoal) && campaignGoal > 0
        ? String(Math.round(campaignGoal / Math.max(1, current.length + 1)))
        : "";
    const next = [
      ...current.map((student) => ({ ...student, individualGoal: student.individualGoal || splitGoal })),
      {
        id: saved.id,
        firstName: saved.firstName,
        lastName: saved.lastName,
        nickname: saved.nickname,
        grade: saved.grade,
        school: saved.school,
        individualGoal: splitGoal,
        photo: saved.photo,
      },
    ];
    onPatch({
      students: next,
      studentFirstName: next[0]?.firstName ?? "",
      studentLastName: next[0]?.lastName ?? "",
      studentNickname: next[0]?.nickname ?? "",
      studentGrade: next[0]?.grade ?? "",
      studentSchool: next[0]?.school ?? "",
      studentIndividualGoal: next[0]?.individualGoal ?? "",
      studentPhoto: next[0]?.photo ?? "",
    });
  }

  const visibleStudents = students;
  const attachedIds = new Set(visibleStudents.map((student) => student.id).filter(Boolean));
  const availableSaved = savedStudents.filter((saved) => !attachedIds.has(saved.id));

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Add one or more students now, or skip this step and complete student details later from your dashboard.
      </p>

      {availableSaved.length > 0 ? (
        <div className="rounded-lg border border-border bg-card/70 p-4">
          <p className="text-sm font-medium text-primary">Students already on your account</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick a child to add them to this campaign — their details carry over, and they stay one student
            record across every campaign.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableSaved.map((saved) => (
              <Button
                key={saved.id}
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => addSavedStudent(saved)}
              >
                <UserPlus className="size-4" />
                {saved.name || saved.firstName}
                {saved.grade ? <span className="text-xs opacity-70">{saved.grade}</span> : null}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addStudent}>
          <Plus className="size-4" />
          {visibleStudents.length > 0 ? "Add Another Student" : "Add Student"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={skipStudent}>
          Skip - Add Student Later
        </Button>
      </div>

      {visibleStudents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          No student added yet. You can skip this step and add student details later, or add one now.
        </div>
      ) : null}

      {visibleStudents.map((student, index) => (
        <div key={index} className="space-y-5 rounded-lg border border-border bg-card/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-base font-semibold text-primary">
                {[student.firstName, student.lastName].filter(Boolean).join(" ") || `Student ${index + 1}`}
              </h3>
              {student.id ? <Badge variant="secondary">On your account</Badge> : null}
            </div>
            {visibleStudents.length > 1 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeStudent(index)}>
                <Trash2 className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`cf-student-first-${index}`}>First name</Label>
              <Input
                id={`cf-student-first-${index}`}
                className="mt-1.5"
                value={student.firstName}
                onChange={(e) => patchStudent(index, { firstName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor={`cf-student-last-${index}`}>Last name</Label>
              <Input
                id={`cf-student-last-${index}`}
                className="mt-1.5"
                value={student.lastName}
                onChange={(e) => patchStudent(index, { lastName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`cf-student-nick-${index}`}>Nickname (optional)</Label>
            <Input
              id={`cf-student-nick-${index}`}
              className="mt-1.5"
              value={student.nickname}
              onChange={(e) => patchStudent(index, { nickname: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`cf-student-grade-${index}`}>Grade</Label>
            <Input
              id={`cf-student-grade-${index}`}
              className="mt-1.5"
              placeholder="e.g. 5th Grade"
              value={student.grade}
              onChange={(e) => patchStudent(index, { grade: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`cf-student-school-${index}`}>Student school (display)</Label>
            <Input
              id={`cf-student-school-${index}`}
              className="mt-1.5"
              value={student.school}
              onChange={(e) => patchStudent(index, { school: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`cf-student-goal-${index}`}>Individual goal ($)</Label>
            <Input
              id={`cf-student-goal-${index}`}
              inputMode="decimal"
              className="mt-1.5"
              value={student.individualGoal}
              onChange={(e) => patchStudent(index, { individualGoal: e.target.value })}
            />
          </div>
          <div>
            <Label>Student photo</Label>
            <CampaignImageUpload
              label="Click or drop student photo to upload"
              value={student.photo}
              fallbackName={[student.firstName, student.lastName].filter(Boolean).join(" ")}
              round
              onClear={() => patchStudent(index, { photo: "" })}
              onUploaded={([photo]) => photo && patchStudent(index, { photo })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CampaignFormPanelSchool({
  values,
  onPatch,
}: {
  values: CampaignFormValues;
  onPatch: OnPatch;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="cf-school-name">School name</Label>
        <Input
          id="cf-school-name"
          className="mt-1.5"
          value={values.schoolName}
          onChange={(e) => onPatch({ schoolName: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cf-school-address">School address</Label>
        <Input
          id="cf-school-address"
          className="mt-1.5"
          value={values.schoolAddress}
          onChange={(e) => onPatch({ schoolAddress: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cf-school-web">School website</Label>
        <Input
          id="cf-school-web"
          type="url"
          className="mt-1.5 font-mono text-sm"
          value={values.schoolWebsite}
          onChange={(e) => onPatch({ schoolWebsite: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cf-school-logo">School logo URL</Label>
        <Input
          id="cf-school-logo"
          className="mt-1.5 font-mono text-sm"
          value={values.schoolLogo}
          onChange={(e) => onPatch({ schoolLogo: e.target.value })}
        />
        <CampaignImageUpload
          label="Click or drop school logo to upload"
          value={values.schoolLogo}
          onClear={() => onPatch({ schoolLogo: "" })}
          onUploaded={([schoolLogo]) => schoolLogo && onPatch({ schoolLogo })}
        />
      </div>
    </div>
  );
}
