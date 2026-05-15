import { getCampaignFormStudents, type CampaignFormValues } from "@/lib/dashboard/campaign-editor";

export type CampaignCompletion = {
  percent: number;
  missingFields: string[];
  readyForReview: boolean;
};

const REQUIRED_FIELDS: Array<{ key: keyof CampaignFormValues; label: string }> = [
  { key: "title", label: "Campaign title" },
  { key: "description", label: "Campaign story" },
  { key: "goal", label: "Financial goal" },
  { key: "endDate", label: "Campaign end date" },
  { key: "parentName", label: "Parent or guardian name" },
  { key: "parentEmail", label: "Parent or guardian email" },
  { key: "studentFirstName", label: "Student first name" },
  { key: "studentGrade", label: "Student grade" },
  { key: "schoolName", label: "School name" },
  { key: "image", label: "Featured campaign image" },
];

function hasValue(value: unknown) {
  if (typeof value !== "string") return Boolean(value);
  return value.trim().length > 0;
}

function hasPositiveMoney(value: string) {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0;
}

export function calculateCampaignCompletion(values: CampaignFormValues): CampaignCompletion {
  const missingFields = REQUIRED_FIELDS.filter(({ key }) => {
    if (key === "studentFirstName") return getCampaignFormStudents(values).length === 0;
    if (key === "studentGrade") {
      const students = getCampaignFormStudents(values);
      return students.length === 0 || students.every((student) => !student.grade.trim());
    }
    if (key === "goal") return !hasPositiveMoney(values.goal);
    return !hasValue(values[key]);
  }).map(({ label }) => label);

  const completed = REQUIRED_FIELDS.length - missingFields.length;
  const percent = Math.round((completed / REQUIRED_FIELDS.length) * 100);
  return {
    percent,
    missingFields,
    readyForReview: missingFields.length === 0,
  };
}
