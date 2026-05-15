import type { Campaign, CampaignStudent } from "@/lib/campaigns";

export type CampaignFormStudent = {
  firstName: string;
  lastName: string;
  nickname: string;
  grade: string;
  school: string;
  individualGoal: string;
  photo: string;
};

/** Shared shape for create wizard + dashboard edit. */
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
  parentPhoto: string;
  studentFirstName: string;
  studentLastName: string;
  studentNickname: string;
  studentGrade: string;
  studentSchool: string;
  studentIndividualGoal: string;
  studentIndividualRaised: string;
  studentPhoto: string;
  students: CampaignFormStudent[];
  schoolName: string;
  schoolAddress: string;
  schoolWebsite: string;
  schoolLogo: string;
};

export function emptyCampaignFormStudent(): CampaignFormStudent {
  return {
    firstName: "",
    lastName: "",
    nickname: "",
    grade: "",
    school: "",
    individualGoal: "",
    photo: "",
  };
}

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
    parentPhoto: "",
    studentFirstName: "",
    studentLastName: "",
    studentNickname: "",
    studentGrade: "",
    studentSchool: "",
    studentIndividualGoal: "",
    studentIndividualRaised: "",
    studentPhoto: "",
    students: [],
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

export function getCampaignFormStudents(values: CampaignFormValues): CampaignFormStudent[] {
  if (values.students.length > 0) return values.students;
  if (
    values.studentFirstName.trim() ||
    values.studentLastName.trim() ||
    values.studentNickname.trim() ||
    values.studentGrade.trim() ||
    values.studentSchool.trim() ||
    values.studentIndividualGoal.trim() ||
    values.studentPhoto.trim()
  ) {
    return [
      {
        firstName: values.studentFirstName,
        lastName: values.studentLastName,
        nickname: values.studentNickname,
        grade: values.studentGrade,
        school: values.studentSchool,
        individualGoal: values.studentIndividualGoal,
        photo: values.studentPhoto,
      },
    ];
  }
  return [];
}

/** Build a full `Campaign` from admin/parent form values; preserves stats from `previous` when updating. */
export function formValuesToCampaign(values: CampaignFormValues, previous?: Campaign): Campaign {
  const goal = Math.max(0, Number.parseFloat(String(values.goal).replace(/,/g, "")) || 0);
  const gallery = values.galleryText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const slug = slugifyCampaignSlug(values.slug, values.title);
  const formStudents = getCampaignFormStudents(values);
  const studentCount = Math.max(1, formStudents.length);
  const defaultStudentGoal = Math.max(500, Math.round(goal / studentCount) || 1000);

  const students: CampaignStudent[] = formStudents.map((student, index) => {
    const indGoalRaw = Number.parseFloat(String(student.individualGoal).replace(/,/g, ""));
    const indGoal = Number.isFinite(indGoalRaw) ? Math.max(0, indGoalRaw) : 0;
    return {
      firstName: student.firstName.trim() || "Student",
      lastName: student.lastName.trim() || "",
      nickname: student.nickname.trim() || undefined,
      gradeDisplay: student.grade.trim() || "-",
      school: student.school.trim() || values.schoolName.trim() || "-",
      individualGoal: indGoal > 0 ? indGoal : defaultStudentGoal,
      individualRaised: previous?.students[index]?.individualRaised ?? 0,
      photo: student.photo.trim() || previous?.students[index]?.photo,
      avatarInitials: previous?.students[index]?.avatarInitials,
    };
  });

  const defaultImage =
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80";

  return {
    slug,
    title: values.title.trim() || "Untitled campaign",
    tagline: values.tagline.trim() || "-",
    excerpt: values.excerpt.trim() || values.description.slice(0, 280) || "-",
    description: values.description.trim() || "-",
    goal: goal > 0 ? goal : 1000,
    raised: previous?.raised ?? 0,
    donorCount: previous?.donorCount ?? 0,
    daysLeft: previous?.daysLeft ?? 60,
    endDate: values.endDate.trim() || previous?.endDate || "2026-12-31",
    image: values.image.trim() || previous?.image || defaultImage,
    gallery: gallery.length > 0 ? gallery : (previous?.gallery ?? []),
    students,
    school: {
      name: values.schoolName.trim() || "School",
      address: values.schoolAddress.trim() || "",
      website: values.schoolWebsite.trim() || "",
      logo: values.schoolLogo.trim() || previous?.school.logo,
    },
    parent: {
      name: values.parentName.trim() || "-",
      email: values.parentEmail.trim() || "",
      phone: values.parentPhone.trim() || "",
      photo: values.parentPhoto.trim() || previous?.parent.photo,
    },
    breadcrumbCategory: previous?.breadcrumbCategory ?? "Families",
    tags: previous?.tags ?? [],
    updatesCount: previous?.updatesCount ?? 0,
    status: previous?.status,
    completionPercent: previous?.completionPercent,
    missingFields: previous?.missingFields,
    givingLevels: previous?.givingLevels,
    storySections: previous?.storySections,
  };
}

export function campaignToFormValues(c: Campaign): CampaignFormValues {
  const s = c.students[0];
  const students = c.students.map((student) => ({
    firstName: student.firstName,
    lastName: student.lastName,
    nickname: student.nickname ?? "",
    grade: student.gradeDisplay,
    school: student.school,
    individualGoal: String(student.individualGoal),
    photo: student.photo ?? "",
  }));
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
    parentPhoto: c.parent.photo ?? "",
    studentFirstName: s?.firstName ?? "",
    studentLastName: s?.lastName ?? "",
    studentNickname: s?.nickname ?? "",
    studentGrade: s?.gradeDisplay ?? "",
    studentSchool: s?.school ?? "",
    studentIndividualGoal: s ? String(s.individualGoal) : "",
    studentIndividualRaised: "",
    studentPhoto: s?.photo ?? "",
    students,
    schoolName: c.school.name,
    schoolAddress: c.school.address,
    schoolWebsite: c.school.website,
    schoolLogo: c.school.logo ?? "",
  };
}
