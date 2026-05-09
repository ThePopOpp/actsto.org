"use client";

import { useRef, useState } from "react";
import { ImageUp } from "lucide-react";

import type { CampaignFormValues } from "@/lib/dashboard/campaign-editor";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type OnPatch = (patch: Partial<CampaignFormValues>) => void;

function CampaignImageUpload({
  label = "Click or drop files to upload",
  multiple = false,
  onUploaded,
}: {
  label?: string;
  multiple?: boolean;
  onUploaded: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
        <CampaignImageUpload onUploaded={([image]) => image && onPatch({ image })} />
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
          className="mt-1.5"
          value={values.parentPhone}
          onChange={(e) => onPatch({ parentPhone: e.target.value })}
        />
      </div>
      <div>
        <Label>Parent photo</Label>
        <CampaignImageUpload label="Click or drop parent photo to upload" onUploaded={([parentPhoto]) => parentPhoto && onPatch({ parentPhoto })} />
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
        <CampaignImageUpload label="Click or drop student photo to upload" onUploaded={([studentPhoto]) => studentPhoto && onPatch({ studentPhoto })} />
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
        <CampaignImageUpload label="Click or drop school logo to upload" onUploaded={([schoolLogo]) => schoolLogo && onPatch({ schoolLogo })} />
      </div>
    </div>
  );
}
