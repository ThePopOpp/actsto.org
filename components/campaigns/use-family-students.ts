"use client";

import { useCallback, useEffect, useState } from "react";

export type SavedStudent = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  name: string;
  grade: string;
  birthDate: string | null;
  ageVerified: boolean;
  photo: string;
  schoolId: string | null;
  school: string;
  studentUserId: string | null;
  studentInviteEmail: string | null;
  studentInviteExpiresAt: string | null;
  campaigns: Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
    individualGoal: number;
    endsAt: string | null;
  }>;
};

/**
 * The children already saved on the signed-in family's account.
 *
 * Both the create wizard and the campaign editor use this so a parent can pick
 * a child they have already entered instead of retyping their details — which
 * is what previously produced a second student record for the same kid.
 */
export function useFamilyStudents() {
  const [students, setStudents] = useState<SavedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/parent/students", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as { students?: SavedStudent[] } | null;
      setStudents(data?.students ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { students, isLoading, reload };
}
