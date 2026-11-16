/**
 * The Musk Scholars Fund proposal: every word and number in one place.
 *
 * The landing page, email, print one-pager, slide deck and X card all read
 * from here, so a figure corrected once is corrected everywhere. Copy is from
 * docs/elon-musk-scholarship (the design export). Client-safe.
 *
 * Before the link goes live, check the claims about Mr. Musk and the STO
 * figures against SOURCES.
 */

export const PROPOSAL_KEY = "musk-scholars-fund";
export const PROPOSAL_TITLE = "The Musk Scholars Fund";

export const PROPOSAL_COLORS = {
  navy: "#091b36",
  red: "#a62c2d",
  redDark: "#841118",
  ink: "#11161f",
  muted: "#525252",
  subtle: "#737373",
  mist: "#c9d3de",
  pale: "#eef3fa",
  paler: "#f6fbff",
  line: "#e5e5e5",
  lineStrong: "#d4d4d8",
  white: "#ffffff",
} as const;

/** ACT's target average scholarship: one child, one year. */
export const AVERAGE_SCHOLARSHIP = 4000;
/** The proposed founding gift. */
export const PROPOSED_GIFT = 5_000_000;

export type Signer = {
  name: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
};

export const EMPTY_SIGNER: Signer = { name: null, title: null, phone: null, email: null };

/** Which signer fields are still blank. The UI flags these; nothing prints "[Your name]". */
export function missingSignerFields(s: Signer): ("name" | "title" | "phone" | "email")[] {
  return (["name", "title", "phone", "email"] as const).filter((k) => !s[k]?.trim());
}

/** "Jane Doe" / "Jane Doe, Executive Director" / "Executive Director" — never a bracketed placeholder. */
export function signerLine(s: Signer): string {
  return [s.name?.trim(), s.title?.trim()].filter(Boolean).join(", ");
}
export function signerContact(s: Signer): string {
  return ["Arizona Christian Tuition", s.phone?.trim(), s.email?.trim()].filter(Boolean).join(" · ");
}

export function usdShort(n: number): string {
  if (n >= 1_000_000) return `$${n / 1_000_000}M`;
  return `$${n.toLocaleString("en-US")}`;
}

export type ImpactRow = { gift: number; label: string; studentYears: number; proposed: boolean };

/** What each gift size buys, in student-years of tuition. */
export function impactRows(avg = AVERAGE_SCHOLARSHIP): ImpactRow[] {
  return [1_000_000, PROPOSED_GIFT, 25_000_000, 100_000_000].map((gift) => ({
    gift,
    label: usdShort(gift),
    studentYears: Math.floor(gift / avg),
    proposed: gift === PROPOSED_GIFT,
  }));
}

export const HEADLINE = "Fund a generation.";
export const LONG_HEADLINE = "Fund a generation of Arizona kids in Christ-centered, excellence-first schools.";
export const TAGLINE = `Every $${AVERAGE_SCHOLARSHIP.toLocaleString("en-US")} puts one Arizona child in a Christ-centered school for a year.`;
export const SUMMARY =
  "The Musk Scholars Fund at Arizona Christian Tuition (ACT), a certified Arizona School Tuition Organization: tuition scholarships that let families choose a private Christian education.";

export const LETTER = {
  salutation: "Dear Mr. Musk,",
  paragraphs: [
    "You've said you are “a big believer in the principles of Christianity,” and you've built schools of your own because conventional ones weren't delivering. Arizona Christian Tuition (ACT) exists for the same reason.",
    "ACT is a certified Arizona School Tuition Organization. We fund tuition scholarships so families — regardless of income — can choose a private Christian education. Arizona pioneered this model in 1997, and its STOs now move more than $260M a year. But individual tax credits are capped near $3,100, and a family's need is far larger.",
  ],
  ask: `We invite you to make a ${usdShort(PROPOSED_GIFT)} founding gift to establish The Musk Scholars Fund.`,
  giving:
    "The gift is a federally tax-deductible contribution to a 501(c)(3), and can come personally, through the Musk Foundation, a donor-advised fund, or as appreciated stock. Companies with Arizona tax liability can also redirect it dollar-for-dollar into scholarships.",
  closing: "With gratitude,",
};

export const STATS = [
  { value: "$264M", label: "to Arizona STOs (FY2023)", accent: false },
  { value: "$204M", label: "scholarships awarded", accent: false },
  { value: "$3,131", label: "2026 joint credit cap", accent: false },
  { value: `$${AVERAGE_SCHOLARSHIP.toLocaleString("en-US")}`, label: "= one child, one year", accent: true },
] as const;

export const WHY = [
  { title: "Faith.", text: "“I'm actually a big believer in the principles of Christianity.” — with Jordan Peterson, 2024" },
  { title: "Schools.", text: "Founded Ad Astra at SpaceX; opened a new Ad Astra school in Bastrop, TX, in 2024." },
  { title: "Philanthropy.", text: "Musk Foundation seeded ~$100M toward an independent K–12 school and university." },
  { title: "Next generation.", text: "Strong families and civilization's future are central themes — ACT invests in both." },
] as const;

export const GIVING_PATHS = [
  { title: "Direct gift", text: "Federally tax-deductible to ACT, a 501(c)(3); personally, via the Musk Foundation or a DAF." },
  { title: "Appreciated stock", text: "Avoid capital gains; deduct fair market value." },
  { title: "Corporate AZ credit", text: "Arizona tax liability redirected dollar-for-dollar to scholarships." },
] as const;

export const ASK = {
  title: `The ask: a ${usdShort(PROPOSED_GIFT)} founding gift for The Musk Scholars Fund`,
  steps: ["Intro call", "Diligence package", "Gift agreement before April 2027"],
  cta: "Schedule a 30-minute intro call",
};

export const CONTACT_URL = "https://actsto.org/contact";

export const SOURCES = [
  "AZ Dept. of Revenue STO Credit Report FY2023",
  "Christian Today (Jul 2024)",
  "KUT (Jan 2025)",
];

export const DISCLAIMER =
  "Impact at ACT's $4,000 target average scholarship. Deductions subject to IRS limits; AZ credits subject to caps and ADOR pre-approval. Scholarships are awarded by ACT under Arizona STO rules. Not tax advice.";

/** Shown wherever the proposal is published, so no one reads it as an announcement. */
export const NOT_AN_ENDORSEMENT =
  "A proposal from Arizona Christian Tuition. Mr. Musk has not endorsed or committed to this fund.";

/** Suggested text to go with the X card. */
export const X_POST_TEXT = `An open invitation to @elonmusk: fund a generation. Every $${AVERAGE_SCHOLARSHIP.toLocaleString(
  "en-US",
)} puts one Arizona child in a Christ-centered school for a year. actsto.org`;

/** The 16-character token in the link-only URL. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16}$/;
