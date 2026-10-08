"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_GRADES, canonicalGrade, GRADE_OPTIONS } from "@/lib/grades";
import { cn } from "@/lib/utils";

/**
 * The shared grade dropdown. A stored value that predates the list ("6th
 * Grade", "9") is shown as its mapped grade when it can be mapped, so editing
 * an old record quietly fixes it; otherwise the old text shows until changed.
 */
export function GradeSelect({
  id,
  value,
  onChange,
  allowAllGrades = false,
  disabled,
  className,
  placeholder = "Select a grade",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Adds "All grades", for school-level campaigns. */
  allowAllGrades?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const mapped = value === ALL_GRADES ? value : canonicalGrade(value) ?? value;
  const options: string[] = allowAllGrades ? [ALL_GRADES, ...GRADE_OPTIONS] : [...GRADE_OPTIONS];
  const legacy = mapped && !options.includes(mapped) ? mapped : null;

  return (
    <Select value={mapped || undefined} onValueChange={(v) => onChange(v ?? "")} disabled={disabled}>
      <SelectTrigger id={id} className={cn("h-10 w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {legacy ? (
          <SelectItem value={legacy} disabled>
            {legacy} (choose from the list)
          </SelectItem>
        ) : null}
        {options.map((grade) => (
          <SelectItem key={grade} value={grade}>
            {grade}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
