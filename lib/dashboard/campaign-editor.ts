import type { Campaign, CampaignStudent } from "@/lib/campaigns";

/** Shared shape for create wizard + dashboard edit (demo-local state). */
export type CampaignFormValues = {
  slug: string;
  title: string;
  description: string;
  tagline: string;
  excerpt: string;
  startDate: string;
  endDate: string;
  goal: string;
  image: string;
  galleryText: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentFirstName: string;
  studentLastName: string;
  studentNickname: string;
  studentGrade: string;
  studentSchool: string;
  studentIndividualGoal: string;
  studentIndividualRaised: string;
  schoolName: string;
  schoolAddress: string;
  schoolWebsite: string;
  schoolLogo: string;
};

export function emptyCampaignFormValues(): CampaignFormValues {
  return {
    slug: "",
    title: "",
    description: "",
    tagline: "",
    excerpt: "",
    startDate: "",
    endDate: "",
    goal: "",
    image: "",
    galleryText: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    studentFirstName: "",
    studentLastName: "",
    studentNickname: "",
    studentGrade: "",
    studentSchool: "",
    studentIndividualGoal: "",
    studentIndividualRaised: "",
    schoolName: "",
    schoolAddress: "",
    schoolWebsite: "",
    schoolLogo: "",
  };
}

/** URL-safe slug for campaign routes (admin can edit; empty falls back to title). */
export function slugifyCampaignSlug(raw: string, fallbackTitle: string): string {
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (s.length > 0) return s;
  const fromTitle = fallbackTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return fromTitle || `campaign-${Date.now()}`;
}

/** Build a full `Campaign` from admin/parent form values; preserves stats from `previous` when updating. */
export function formValuesToCampaign(values: CampaignFormValues, previous?: Campaign): Campaign {
  const goal = Math.max(0, Number.parseFloat(String(values.goal).replace(/,/g, "")) || 0);
  const gallery = values.galleryText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const indGoalRaw = Number.parseFloat(String(values.studentIndividualGoal).replace(/,/g, ""));
  const indRaisedRaw = Number.parseFloat(String(values.studentIndividualRaised).replace(/,/g, ""));
  const indGoal = Number.isFinite(indGoalRaw) ? Math.max(0, indGoalRaw) : 0;
  const indRaised = Number.isFinite(indRaisedRaw)
    ? Math.max(0, indRaisedRaw)
    : (previous?.students[0]?.individualRaised ?? 0);
  const slug = slugifyCampaignSlug(values.slug, values.title);

  const student: CampaignStudent = {
    firstName: values.studentFirstName.trim() || "Student",
    lastName: values.studentLastName.trim() || "",
    nickname: values.studentNickname.trim() || undefined,
    gradeDisplay: values.studentGrade.trim() || "—",
    school: values.studentSchool.trim() || values.schoolName.trim() || "—",
    individualGoal: indGoal > 0 ? indGoal : Math.max(500, Math.round(goal / 4) || 1000),
    individualRaised: indRaised,
    photo: previous?.students[0]?.photo,
    avatarInitials: previous?.students[0]?.avatarInitials,
  };

  const defaultImage =
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80";

  return {
    slug,
    title: values.title.trim() || "Untitled campaign",
    tagline: values.tagline.trim() || "—",
    excerpt: values.excerpt.trim() || values.description.slice(0, 280) || "—",
    description: values.description.trim() || "—",
    goal: goal > 0 ? goal : 1000,
    raised: previous?.raised ?? 0,
    donorCount: previous?.donorCount ?? 0,
    daysLeft: previous?.daysLeft ?? 60,
    endDate: values.endDate.trim() || previous?.endDate || "2026-12-31",
    image: values.image.trim() || previous?.image || defaultImage,
    gallery: gallery.length > 0 ? gallery : (previous?.gallery ?? []),
    students: [student],
    school: {
      name: values.schoolName.trim() || "School",
      address: values.schoolAddress.trim() || "",
      website: values.schoolWebsite.trim() || "",
      logo: values.schoolLogo.trim() || previous?.school.logo,
    },
    parent: {
      name: values.parentName.trim() || "—",
      email: values.parentEmail.trim() || "",
      phone: values.parentPhone.trim() || "",
      photo: previous?.parent.photo,
    },
    breadcrumbCategory: previous?.breadcrumbCategory ?? "Families",
    tags: previous?.tags ?? [],
    updatesCount: previous?.updatesCount ?? 0,
    givingLevels: previous?.givingLevels,
    storySections: previous?.storySections,
  };
}

export function campaignToFormValues(c: Campaign): CampaignFormValues {
  const s = c.students[0];
  return {
    slug: c.slug,
    title: c.title,
    description: c.description,
    tagline: c.tagline,
    excerpt: c.excerpt,
    startDate: "",
    endDate: c.endDate,
    goal: String(c.goal),
    image: c.image,
    galleryText: c.gallery.join("\n"),
    parentName: c.parent.name,
    parentEmail: c.parent.email,
    parentPhone: c.parent.phone,
    studentFirstName: s?.firstName ?? "",
    studentLastName: s?.lastName ?? "",
    studentNickname: s?.nickname ?? "",
    studentGrade: s?.gradeDisplay ?? "",
    studentSchool: s?.school ?? "",
    studentIndividualGoal: s ? String(s.individualGoal) : "",
    studentIndividualRaised: s ? String(s.individualRaised) : "",
    schoolName: c.school.name,
    schoolAddress: c.school.address,
    schoolWebsite: c.school.website,
    schoolLogo: c.school.logo ?? "",
  };
}
