"use client";

import { useEffect, useState } from "react";

import type { SchoolListItem } from "@/app/api/schools/route";

/**
 * The school a student attends, from the same approved list the application
 * and campaign forms use. A school added under "Other school" on a campaign
 * stays selected even before staff approve it.
 */
export function StudentSchoolSelect({
  id,
  value,
  currentName,
  onChange,
  className = "",
}: {
  id?: string;
  value: string;
  /** Name of the student's current school, shown when it isn't on the list yet. */
  currentName?: string;
  onChange: (schoolId: string) => void;
  className?: string;
}) {
  const [schools, setSchools] = useState<SchoolListItem[] | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/schools")
      .then((res) => res.json() as Promise<{ schools?: SchoolListItem[] }>)
      .then((data) => mounted && setSchools(data.schools ?? []))
      .catch(() => mounted && setSchools([]));
    return () => {
      mounted = false;
    };
  }, []);

  const offList = value && schools && !schools.some((s) => s.id === value);
  return (
    <select
      id={id}
      className={`h-10 w-full rounded-md border border-input bg-background px-2 text-sm ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{schools === null ? "Loading schools…" : "Choose a school"}</option>
      {offList ? <option value={value}>{currentName || "Current school"} (waiting for review)</option> : null}
      {(schools ?? []).map((school) => (
        <option key={school.id} value={school.id}>
          {school.name}
          {school.city ? ` — ${school.city}` : ""}
        </option>
      ))}
    </select>
  );
}
