/** PDFs served from /docs/ador (Arizona Department of Revenue tax credit publications). */
export const ADOR_DOCS_BASE = "/docs/ador";

export type AdorFormYearRow = {
  taxYear: string;
  formFile: string;
  instructionsFile: string;
};

export type AdorFormGroup = {
  title: string;
  formLabel: string;
  rows: AdorFormYearRow[];
};

export const ADOR_REFERENCE_FORM_GROUPS: AdorFormGroup[] = [
  {
    title: "Credit for Contributions to School Tuition Organization",
    formLabel: "Form 323",
    rows: [
      {
        taxYear: "2024",
        formFile: "FORMS_CREDIT_2024_323_f.pdf",
        instructionsFile: "FORMS_CREDIT_2024_323i.pdf",
      },
      {
        taxYear: "2025",
        formFile: "FORMS_CREDIT_2025_323_f.pdf",
        instructionsFile: "FORMS_CREDIT_2025_323_i.pdf",
      },
    ],
  },
  {
    title: "Credit for Contributions — STO — Individuals",
    formLabel: "Form 348",
    rows: [
      {
        taxYear: "2024",
        formFile: "FORMS_CREDIT_2024_348_f.pdf",
        instructionsFile: "FORMS_CREDIT_2024_348i.pdf",
      },
      {
        taxYear: "2025",
        formFile: "FORMS_CREDIT_2025_348_f.pdf",
        instructionsFile: "FORMS_CREDIT_2025_348_i.pdf",
      },
    ],
  },
  {
    title: "Nonrefundable Individual Tax Credits and Recapture",
    formLabel: "Form 301",
    rows: [
      {
        taxYear: "2024",
        formFile: "FORMS_CREDIT_2024_301_f.pdf",
        instructionsFile: "FORMS_CREDIT_2024_301i.pdf",
      },
      {
        taxYear: "2025",
        formFile: "FORMS_CREDIT_2025_301_f.pdf",
        instructionsFile: "FORMS_CREDIT_2025_301_i.pdf",
      },
    ],
  },
];
