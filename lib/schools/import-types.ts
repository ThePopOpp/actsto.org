/** Result of a school CSV import (or its preview). Client-safe. */
export type SchoolImportRow = {
  line: number;
  name: string;
  outcome: "created" | "updated" | "unchanged" | "error";
  message?: string;
};

export type SchoolImportResult = {
  dryRun: boolean;
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  rows: SchoolImportRow[];
  unknownColumns: string[];
};
