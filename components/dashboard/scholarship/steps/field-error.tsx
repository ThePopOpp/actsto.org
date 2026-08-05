"use client";

import { useCallback } from "react";

import type { ValidationIssue } from "@/lib/scholarship/validation";

/**
 * Inline field errors, associated to their input via `aria-describedby`.
 *
 * Colour is never the only signal — every error carries text.
 */
export function FieldError({ id, issue }: { id: string; issue: ValidationIssue | undefined }) {
  if (!issue) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-destructive">
      {issue.message}
    </p>
  );
}

export function useFieldIssue(issues: ValidationIssue[]) {
  return useCallback(
    (field: string) => issues.find((issue) => issue.field === field),
    [issues],
  );
}
