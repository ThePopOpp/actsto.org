"use client";

import type { CampaignFormValues } from "@/lib/dashboard/campaign-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type OnPatch = (patch: Partial<CampaignFormValues>) => void;

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
          <Input
            id="cf-start"
            type="date"
            className="mt-1.5"
            value={values.startDate}
            onChange={(e) => onPatch({ startDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="cf-end">Campaign end date</Label>
          <Input
            id="cf-end"
            type="date"
            className="mt-1.5"
            value={values.endDate}
            onChange={(e) => onPatch({ endDate: e.target.value })}
          />
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
        <div className="mt-1.5 flex h-32 cursor-pointer items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
          Click or drop files to upload
        </div>
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
        <div className="mt-1.5 flex h-32 cursor-pointer items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
          Click or drop files to upload
        </div>
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
          className="mt-1.5"
          value={values.parentPhone}
          onChange={(e) => onPatch({ parentPhone: e.target.value })}
        />
      </div>
      <div>
        <Label>Parent photo</Label>
        <div className="mt-1.5 flex h-28 cursor-pointer items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
          Click or drop files to upload
        </div>
      </div>
    </div>
  );
}

export function CampaignFormPanelStudent({
  values,
  onPatch,
}: {
  values: CampaignFormValues;
  onPatch: OnPatch;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Primary student on this campaign (matches creation flow; additional students can be added when the API is
        connected).
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cf-student-first">First name</Label>
          <Input
            id="cf-student-first"
            className="mt-1.5"
            value={values.studentFirstName}
            onChange={(e) => onPatch({ studentFirstName: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="cf-student-last">Last name</Label>
          <Input
            id="cf-student-last"
            className="mt-1.5"
            value={values.studentLastName}
            onChange={(e) => onPatch({ studentLastName: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="cf-student-nick">Nickname (optional)</Label>
        <Input
          id="cf-student-nick"
          className="mt-1.5"
          value={values.studentNickname}
          onChange={(e) => onPatch({ studentNickname: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cf-student-grade">Grade</Label>
        <Input
          id="cf-student-grade"
          className="mt-1.5"
          placeholder="e.g. 5th Grade"
          value={values.studentGrade}
          onChange={(e) => onPatch({ studentGrade: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cf-student-school">Student school (display)</Label>
        <Input
          id="cf-student-school"
          className="mt-1.5"
          value={values.studentSchool}
          onChange={(e) => onPatch({ studentSchool: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cf-student-goal">Individual goal ($)</Label>
          <Input
            id="cf-student-goal"
            inputMode="decimal"
            className="mt-1.5"
            value={values.studentIndividualGoal}
            onChange={(e) => onPatch({ studentIndividualGoal: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="cf-student-raised">Raised toward individual goal ($)</Label>
          <Input
            id="cf-student-raised"
            inputMode="decimal"
            className="mt-1.5"
            value={values.studentIndividualRaised}
            onChange={(e) => onPatch({ studentIndividualRaised: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Student photo</Label>
        <div className="mt-1.5 flex h-28 cursor-pointer items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
          Click or drop files to upload
        </div>
      </div>
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
        <div className="mt-1.5 flex h-28 cursor-pointer items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
          Click or drop files to upload
        </div>
      </div>
    </div>
  );
}
