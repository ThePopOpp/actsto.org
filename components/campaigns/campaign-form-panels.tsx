"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";

import { useFamilyStudents, type SavedStudent } from "@/components/campaigns/use-family-students";
import { GradeSelect } from "@/components/grade-select";
import { Badge } from "@/components/ui/badge";

import type { CampaignFormValues } from "@/lib/dashboard/campaign-editor";
import { composeParentName, emptyCampaignFormStudent, getCampaignFormStudents } from "@/lib/dashboard/campaign-editor";
import { emptySchoolDetails, type SchoolDetails } from "@/lib/schools/details";
import type { SchoolListItem } from "@/app/api/schools/route";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatUsPhone } from "@/lib/utils";
import { campaignEndDateError, maxCampaignEndDate } from "@/lib/campaign-dates";
import { MediaField } from "@/components/ui/media-field";

type OnPatch = (patch: Partial<CampaignFormValues>) => void;

/** The gallery is stored as one link per line. */
function galleryList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
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
          <DatePicker
            id="cf-end"
            value={values.endDate}
            onChange={(endDate) => onPatch({ endDate })}
            minDate={values.startDate || undefined}
            maxDate={maxCampaignEndDate(values.startDate)}
          />
          {campaignEndDateError(values.startDate, values.endDate) ? (
            <p className="mt-1 text-xs text-destructive">{campaignEndDateError(values.startDate, values.endDate)}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Can run until June 30, {maxCampaignEndDate(values.startDate).slice(0, 4)}.
            </p>
          )}
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
      <MediaField
        id="cf-hero"
        label="Featured image"
        folder="campaigns"
        hint="JPG or PNG, landscape works best"
        value={values.image}
        onChange={(image) => onPatch({ image })}
      />
      <MediaField
        id="cf-gallery"
        label="Photo gallery"
        folder="campaigns"
        multiple
        values={galleryList(values.galleryText)}
        onChangeValues={(urls) => onPatch({ galleryText: urls.join("\n") })}
      />
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cf-parent-first">Parent / guardian first name</Label>
          <Input
            id="cf-parent-first"
            className="mt-1.5"
            autoComplete="given-name"
            value={values.parentFirstName}
            onChange={(e) =>
              onPatch({
                parentFirstName: e.target.value,
                parentName: composeParentName({ ...values, parentFirstName: e.target.value }),
              })
            }
          />
        </div>
        <div>
          <Label htmlFor="cf-parent-last">Last name</Label>
          <Input
            id="cf-parent-last"
            className="mt-1.5"
            autoComplete="family-name"
            value={values.parentLastName}
            onChange={(e) =>
              onPatch({
                parentLastName: e.target.value,
                parentName: composeParentName({ ...values, parentLastName: e.target.value }),
              })
            }
          />
        </div>
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
      <MediaField
        label="Parent photo"
        folder="people"
        shape="round"
        fallbackName={values.parentName}
        value={values.parentPhoto}
        onChange={(parentPhoto) => onPatch({ parentPhoto })}
      />
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
            <GradeSelect
              id={`cf-student-grade-${index}`}
              className="mt-1.5"
              value={student.grade}
              onChange={(grade) => patchStudent(index, { grade })}
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
          <MediaField
            label="Student photo"
            folder="people"
            shape="round"
            fallbackName={[student.firstName, student.lastName].filter(Boolean).join(" ")}
            value={student.photo}
            onChange={(photo) => patchStudent(index, { photo })}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * The campaign's school, picked from the approved list so every campaign,
 * student and application points at one school record. "Not listed" takes a
 * typed name and creates a pending school for staff to approve or merge; it
 * never edits an existing school's details.
 */
export function CampaignFormPanelSchool({
  values,
  onPatch,
}: {
  values: CampaignFormValues;
  onPatch: OnPatch;
}) {
  const [schools, setSchools] = useState<SchoolListItem[] | null>(null);
  const [notListed, setNotListed] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/schools")
      .then((res) => res.json() as Promise<{ schools?: SchoolListItem[] }>)
      .then((data) => {
        if (!mounted) return;
        const list = data.schools ?? [];
        setSchools(list);
        // An older campaign stored only a name: select the matching school.
        if (!values.schoolId && values.schoolName) {
          const match = list.find((school) => school.name.toLowerCase() === values.schoolName.trim().toLowerCase());
          if (match) onPatch({ schoolId: match.id, schoolName: match.name });
          else setNotListed(true);
        }
      })
      .catch(() => mounted && setSchools([]));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load the list once
  }, []);

  const picked = schools?.find((school) => school.id === values.schoolId) ?? null;
  // A school this family added earlier and ACT hasn't approved yet: it has an
  // id but isn't on the public list. Keep it rather than asking again.
  const pendingOwn = Boolean(values.schoolId) && schools !== null && !picked;
  const showTyped = !pendingOwn && (notListed || (schools !== null && schools.length === 0));
  const details = values.schoolDetails;
  const patchDetails = (patch: Partial<SchoolDetails>) => onPatch({ schoolDetails: { ...details, ...patch } });

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="cf-school-pick">School</Label>
        <select
          id="cf-school-pick"
          className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={showTyped || pendingOwn ? "__other__" : values.schoolId}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "__other__") {
              setNotListed(true);
              onPatch({ schoolId: "", schoolName: "", schoolDetails: emptySchoolDetails() });
              return;
            }
            setNotListed(false);
            const school = schools?.find((item) => item.id === next);
            onPatch({
              schoolId: next,
              schoolName: school?.name ?? "",
              schoolAddress: school?.address ?? "",
              schoolWebsite: school?.website ?? "",
              schoolLogo: school?.logoUrl ?? "",
            });
          }}
        >
          <option value="">{schools === null ? "Loading schools…" : "Choose a school"}</option>
          {(schools ?? []).map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
              {school.city ? ` — ${school.city}` : ""}
            </option>
          ))}
          {values.isSchoolLevel ? null : <option value="__other__">Other school (not listed)</option>}
        </select>
        {picked ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {[picked.address, picked.website].filter(Boolean).join(" · ") || "School details are kept by ACT."} Our team
            keeps each school&apos;s details up to date.
          </p>
        ) : null}
      </div>

      {pendingOwn ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          {values.schoolName || "This school"} is saved and waiting for our team to add it to the list. Choose
          another school above to change it.
        </p>
      ) : null}

      {showTyped ? (
        <div className="space-y-5 rounded-lg border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">
            Add the school. It is saved with your campaign, and once our team checks it, other families can choose it
            too.
          </p>
          <div>
            <Label htmlFor="cf-school-name">School name</Label>
            <Input
              id="cf-school-name"
              className="mt-1.5"
              placeholder="Full name and campus or city"
              value={values.schoolName}
              onChange={(e) => onPatch({ schoolName: e.target.value, schoolId: "" })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="cf-school-line1">Street address</Label>
              <Input
                id="cf-school-line1"
                className="mt-1.5"
                autoComplete="off"
                value={details.addressLine1}
                onChange={(e) => patchDetails({ addressLine1: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="cf-school-line2">Address line 2 (optional)</Label>
              <Input
                id="cf-school-line2"
                className="mt-1.5"
                autoComplete="off"
                value={details.addressLine2}
                onChange={(e) => patchDetails({ addressLine2: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cf-school-city">City</Label>
              <Input id="cf-school-city" className="mt-1.5" value={details.city} onChange={(e) => patchDetails({ city: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cf-school-state">State</Label>
                <Input
                  id="cf-school-state"
                  className="mt-1.5 uppercase"
                  maxLength={2}
                  value={details.state}
                  onChange={(e) => patchDetails({ state: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <Label htmlFor="cf-school-zip">ZIP</Label>
                <Input
                  id="cf-school-zip"
                  inputMode="numeric"
                  className="mt-1.5"
                  maxLength={10}
                  value={details.zip}
                  onChange={(e) => patchDetails({ zip: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cf-school-phone">Phone</Label>
              <Input
                id="cf-school-phone"
                type="tel"
                className="mt-1.5"
                value={details.phone}
                onChange={(e) => patchDetails({ phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cf-school-web">Website</Label>
              <Input
                id="cf-school-web"
                type="url"
                className="mt-1.5 font-mono text-sm"
                placeholder="https://"
                value={values.schoolWebsite}
                onChange={(e) => onPatch({ schoolWebsite: e.target.value })}
              />
            </div>
          </div>
          <MediaField
            label="School logo"
            folder="schools"
            shape="square"
            value={values.schoolLogo}
            onChange={(schoolLogo) => onPatch({ schoolLogo })}
          />
          <MediaField
            label="School featured image"
            folder="schools"
            value={details.featuredImageUrl}
            onChange={(featuredImageUrl) => patchDetails({ featuredImageUrl })}
          />
          <MediaField
            label="School photo gallery"
            folder="schools"
            multiple
            values={details.galleryUrls}
            onChangeValues={(galleryUrls) => patchDetails({ galleryUrls })}
          />
        </div>
      ) : null}
    </div>
  );
}
