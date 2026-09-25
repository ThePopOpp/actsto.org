
  "https://arizonachristiantuition.com/wp-content/uploads/2026/03/Valley.Logo_.Round_.png";

/** Labels used on the homepage “Browse by School Type” chips and `/campaigns?schoolType=` filter. */
export const BROWSE_SCHOOL_TYPE_LABELS = [
  "PreSchools",
  "Elementary Schools",
  "Middle Schools",
  "High Schools",
  "Trade Schools",
  "Private Schools",
  "STEM",
  "Vocational",
  "Scholarships",
] as const;

export type BrowseSchoolTypeLabel = (typeof BROWSE_SCHOOL_TYPE_LABELS)[number];

const BROWSE_SCHOOL_TYPE_SET = new Set<string>(BROWSE_SCHOOL_TYPE_LABELS);

export function parseSchoolTypeParam(
  value: string | null | undefined
): BrowseSchoolTypeLabel | null {
  if (!value) return null;
  const decoded = decodeURIComponent(value.trim());
  return BROWSE_SCHOOL_TYPE_SET.has(decoded) ? (decoded as BrowseSchoolTypeLabel) : null;
}

export type CampaignFilter =
  | "all"
  | "ending-soon"
  | "new"
  | "almost-funded"
  | "fully-funded";

const CAMPAIGN_FILTER_IDS: CampaignFilter[] = [
  "all",
  "ending-soon",
  "new",
  "almost-funded",
  "fully-funded",
];

export function parseCampaignFilterParam(value: string | null | undefined): CampaignFilter {
  if (value && CAMPAIGN_FILTER_IDS.includes(value as CampaignFilter)) {
    return value as CampaignFilter;
  }
  return "all";
}

export type CampaignStudent = {
  /**
   * `students.id` when this student is a saved record on the family's account.
   * Carried through the editor so a save re-links the same child instead of
   * creating a duplicate student row for every campaign they appear on.
   */
  id?: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  /** Display label, e.g. "5th Grade" */
  gradeDisplay: string;
  school: string;
  photo?: string;
  /** When set (and no photo), shown in the avatar circle instead of first+last initials */
  avatarInitials?: string;
  individualGoal: number;
  individualRaised: number;
};

export type CampaignGivingLevel = {
  title: string;
  amount: number;
  description: string;
  donorCount: number;
  /** When set, show urgency (e.g. limited matching spots) */
  spotsLeft?: number | null;
  perks?: string[];
  /** Shown in quick donate tier cards, e.g. "Est. Aug 2026" */
  estimateLabel?: string;
};

export type CampaignStorySection = {
  heading: string;
  body: string;
};

export type Campaign = {
  slug: string;
  title: string;
  tagline: string;
  excerpt: string;
  description: string;
  goal: number;
  raised: number;
  donorCount: number;
  daysLeft: number;
  endDate: string;
  image: string;
  gallery: string[];
  students: CampaignStudent[];
  school: {
    name: string;
    address: string;
    website: string;
    logo?: string;
  };
  parent: {
    /** Profile id of the campaign owner — needed to start a direct message. */
    id?: string;
    name: string;
    email: string;
    phone: string;
    photo?: string;
  };
  /** Breadcrumb: Home › Campaigns › category › title */
  breadcrumbCategory?: string;
  /** Homepage / campaigns school-type chips; must use labels from BROWSE_SCHOOL_TYPE_LABELS */
  browseSchoolTypes?: BrowseSchoolTypeLabel[];
  tags?: string[];
  updatesCount?: number;
  status?: string;
  completionPercent?: number;
  missingFields?: string[];
  givingLevels?: CampaignGivingLevel[];
  storySections?: CampaignStorySection[];
};

/** Fallback tiers when a campaign has no giving levels of its own. */
export function getCampaignGivingLevels(c: Campaign): CampaignGivingLevel[] {
  if (c.givingLevels?.length) return c.givingLevels;
  const unit = Math.max(100, Math.round(c.goal / 12));
  const defaultPerks = [
    "Tax credit receipt",
    "Thank-you note from family",
    "Campaign updates",
  ];
  return [
    {
      title: "Supporter",
      amount: unit,
      description: "Join others supporting tuition through this campaign.",
      donorCount: Math.max(1, c.donorCount - 1),
      perks: defaultPerks,
    },
    {
      title: "Partner",
      amount: unit * 3,
      description: "A mid-level gift that moves the goal meaningfully.",
      donorCount: Math.max(1, Math.floor(c.donorCount / 2)),
      perks: defaultPerks,
    },
    {
      title: "Champion",
      amount: unit * 6,
      description: "Leadership-level support for this scholarship effort.",
      donorCount: 1,
      spotsLeft: 8,
      perks: defaultPerks,
    },
  ];
}

export function filterCampaignsBySchoolType(
  list: Campaign[],
  schoolType: BrowseSchoolTypeLabel | null
): Campaign[] {
  if (!schoolType) return list;
  return list.filter((c) => c.browseSchoolTypes?.includes(schoolType));
}

export function filterCampaigns(
  list: Campaign[],
  filter: CampaignFilter
): Campaign[] {
  if (filter === "all") return list;
  const pct = (c: Campaign) =>
    c.goal > 0 ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : 0;
  if (filter === "ending-soon")
    return [...list].filter((c) => c.daysLeft <= 60).sort((a, b) => a.daysLeft - b.daysLeft);
  if (filter === "new") return [...list].sort((a, b) => b.daysLeft - a.daysLeft);
  if (filter === "almost-funded")
    return list.filter((c) => {
      const p = pct(c);
      return p >= 70 && p < 100;
    });
  if (filter === "fully-funded") return list.filter((c) => pct(c) >= 100);
  return list;
}

export function campaignStats(list: Campaign[]) {
  const raised = list.reduce((s, c) => s + c.raised, 0);
  const donors = list.reduce((s, c) => s + c.donorCount, 0);
  return {
    active: list.length,
    raisedThisYear: raised,
    totalDonors: donors,
  };
}
