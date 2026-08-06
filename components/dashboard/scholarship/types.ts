import type { HouseholdMemberView } from "@/lib/scholarship/income";

/** Plain serializable shapes handed from the server page to the client wizard. */

export type WizardDocument = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  documentKind: string;
  uploadedAt: string;
  verifiedAt: string | null;
};

export type WizardApplication = {
  id: string;
  studentId: string;
  schoolYear: string | null;
  schoolId: string | null;
  schoolNameOther: string | null;
  grade: string | null;
  tuitionAfterDiscounts: number | null;
  narrative: string;
  incomeConfirmedAt: string | null;
  overflowQualification: string;
  overflowOrg: string | null;
  overflowComments: string | null;
  esaCurrentYear: string | null;
  esaPriorYear: string | null;
  status: string;
  lockedAt: string | null;
  confirmationCode: string | null;
  attemptNumber: number;
  needsInfoDueAt: string | null;
  /** A needs-info deadline lapsed unanswered. The sections stay open to a late reply. */
  infoNotReceived: boolean;
  /** Sections staff reopened. Empty means "all of it" or "none of it", per status. */
  fieldsRequested: string[];
  documents: WizardDocument[];
};

export type WizardStudent = {
  id: string;
  name: string;
  grade: string | null;
  schoolId: string | null;
};

export type WizardSchool = {
  id: string;
  name: string;
  city: string | null;
};

export type WizardParentDetails = {
  name: string;
  phone: string | null;
  addressLines: string[];
};

export type WizardWindow = {
  schoolYear: string;
  closesAt: string;
  closesAtLabel: string;
  showClosingDate: boolean;
  canSubmit: boolean;
  phase: string;
};

export type WizardData = {
  application: WizardApplication;
  students: WizardStudent[];
  schools: WizardSchool[];
  schoolYears: string[];
  parent: WizardParentDetails;
  household: HouseholdMemberView[];
  householdLastUpdated: string | null;
  window: WizardWindow | null;
  /** The staff message on an open needs_info request. Never an internal note. */
  reviewerMessage: string | null;
  /** The denial message from the attempt this one supersedes. */
  priorDenialMessage: string | null;
  /**
   * The household as frozen at submission. Null until submitted. Read this
   * rather than the live household on any post-submission view — the two
   * deliberately diverge the moment a parent edits their income again, and the
   * certified figures are what the review team is working from.
   */
  certifiedIncome: {
    annualTotal: number;
    memberCount: number;
    members: { fullName: string; roleLabel: string | null; annualTotal: number }[];
  } | null;
  /** Files that were purged before a resubmission and must be re-supplied. */
  missingImportedDocuments: string[];
};
