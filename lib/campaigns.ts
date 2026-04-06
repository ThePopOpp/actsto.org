const TEAM_PHONE = "+1 (602) 421-8301";

const VALLEY_CHRISTIAN_SCHOOL_LOGO =
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
  givingLevels?: CampaignGivingLevel[];
  storySections?: CampaignStorySection[];
};

export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    slug: "waters-family-fundraiser",
    title: "Waters Family Fundraiser",
    tagline: "Empowering My Kids Through God and Education",
    excerpt:
      "Jace is growing into a young man with a big heart, strong curiosity, and a desire to learn and lead with purpose.",
    description:
      "Our family has chosen to invest in Christ-centered education at Valley Christian Schools. This campaign helps bridge tuition so Jace can thrive academically and spiritually. Thank you for prayerfully considering a tax-credit gift.",
    goal: 15000,
    raised: 3750,
    donorCount: 9,
    daysLeft: 69,
    endDate: "2026-05-31",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1580582932707-520aed937d17?w=400&q=80",
      "https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=400&q=80",
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&q=80",
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&q=80",
    ],
    students: [
      {
        firstName: "Jace",
        lastName: "Waters",
        nickname: "JC",
        gradeDisplay: "5th Grade",
        school: "Valley Christian Schools",
        avatarInitials: "JC",
        individualGoal: 5000,
        individualRaised: 1250,
      },
    ],
    school: {
      name: "Valley Christian Schools",
      address: "Avondale, AZ",
      website: "https://www.vcsaz.org/",
      logo: VALLEY_CHRISTIAN_SCHOOL_LOGO,
    },
    parent: {
      name: "Jeremy Waters",
      email: "jwaters@example.com",
      phone: "+1 (480) 352-7598",
    },
    breadcrumbCategory: "Families",
    browseSchoolTypes: [
      "Elementary Schools",
      "Private Schools",
      "Scholarships",
      "STEM",
    ],
    tags: ["Family campaign", "K–8", "Valley Christian", "Tax credit", "Scholarship"],
    updatesCount: 1,
    storySections: [
      {
        heading: "The opportunity",
        body:
          "Arizona’s private school tax credit program lets you redirect state taxes you already owe into tuition scholarships—at no net cost when you give up to your limit. This campaign helps our family cover the gap between what we can pay and the cost of Christ-centered education for Jace.",
      },
      {
        heading: "Our scholarship model",
        body:
          "Gifts through Arizona Christian Tuition Organization support STO scholarships awarded to qualifying students. Your donation is recommendation-based and must comply with state rules; ACT handles stewardship, receipts, and compliance workflows.",
      },
      {
        heading: "Outcomes we’re praying for",
        body:
          "We’re investing in character, academics, and faith formation. Every gift extends how long Jace can remain in a school that aligns with our values—and frees us to invest in activities, service, and savings.",
      },
    ],
    givingLevels: [
      {
        title: "Faith Friend",
        amount: 250,
        description: "Support one month of Jace's education.",
        donorCount: 0,
        spotsLeft: 10,
        estimateLabel: "Est. Aug 2026",
        perks: [
          "Tax credit receipt",
          "Thank-you note from family",
          "Campaign updates",
        ],
      },
      {
        title: "Semester Champion",
        amount: 1500,
        description: "Fund one semester for a deserving student.",
        donorCount: 0,
        spotsLeft: 4,
        estimateLabel: "Est. Aug 2026",
        perks: [
          "Tax credit receipt",
          "Thank-you note from family",
          "Campaign updates",
        ],
      },
      {
        title: "Full Year Scholar",
        amount: 3750,
        description: "Fully sponsor one student's school year impact through this campaign.",
        donorCount: 0,
        estimateLabel: "Est. Aug 2026",
        perks: [
          "Tax credit receipt",
          "Thank-you note from family",
          "Campaign updates",
        ],
      },
    ],
  },
  {
    slug: "leavitt-family-fundraiser",
    title: "Leavitt Family Fundraiser",
    tagline: "Empowering Three Futures Through Faith-Filled Education",
    excerpt:
      "The Leavitt family is working hard to provide their three children with a Christ-centered education.",
    description:
      "We are grateful for partners who redirect Arizona tax dollars to scholarships. Your gift changes our children's trajectory.",
    goal: 15000,
    raised: 1000,
    donorCount: 15,
    daysLeft: 56,
    endDate: "2026-06-15",
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400&q=80",
      "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=400&q=80",
    ],
    students: [
      {
        firstName: "Emma",
        lastName: "Leavitt",
        nickname: "Emmy",
        gradeDisplay: "3rd Grade",
        school: "Valley Christian Schools",
        photo:
          "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&q=80",
        individualGoal: 5000,
        individualRaised: 340,
      },
      {
        firstName: "Noah",
        lastName: "Leavitt",
        gradeDisplay: "5th Grade",
        school: "Valley Christian Schools",
        photo:
          "https://images.unsplash.com/photo-1503919009534-9352b7d6fd93?w=400&q=80",
        individualGoal: 5000,
        individualRaised: 380,
      },
      {
        firstName: "Lily",
        lastName: "Leavitt",
        nickname: "Lils",
        gradeDisplay: "1st Grade",
        school: "Valley Christian Schools",
        individualGoal: 5000,
        individualRaised: 280,
      },
    ],
    school: {
      name: "Valley Christian Schools",
      address: "Avondale, AZ",
      website: "https://www.vcsaz.org/",
      logo: VALLEY_CHRISTIAN_SCHOOL_LOGO,
    },
    parent: {
      name: "Chris Leavitt",
      email: "cleavitt@example.com",
      phone: TEAM_PHONE,
    },
    breadcrumbCategory: "Families",
    browseSchoolTypes: [
      "Elementary Schools",
      "Private Schools",
      "Scholarships",
      "Trade Schools",
      "Vocational",
    ],
    tags: ["Multi-student", "K–8", "Valley Christian", "Tax credit"],
    updatesCount: 0,
    storySections: [
      {
        heading: "The opportunity",
        body:
          "Three kids, one mission: raise them in a school that teaches truth with grace. This campaign pools tax-credit gifts so each child can stay enrolled without stretching the family budget past what’s sustainable.",
      },
      {
        heading: "Our scholarship model",
        body:
          "Donations flow through Arizona Christian Tuition Organization as eligible tax-credit contributions. Scholarships are awarded consistent with state law; you receive the documentation you need for your return.",
      },
      {
        heading: "Why your gift matters",
        body:
          "Every dollar reduces the tuition gap across Emma, Noah, and Lily. Thank you for considering a gift—and for praying for their teachers, classmates, and growth.",
      },
    ],
    givingLevels: [
      {
        title: "Family supporter",
        amount: 250,
        description: "Helps cover fees, books, or a partial month of tuition support.",
        donorCount: 8,
        perks: [
          "Tax credit receipt",
          "Thank-you note from family",
          "Campaign updates",
        ],
      },
      {
        title: "Table sponsor",
        amount: 750,
        description: "A mid-year boost shared across all three students in this campaign.",
        donorCount: 4,
        perks: [
          "Tax credit receipt",
          "Thank-you note from family",
          "Campaign updates",
        ],
      },
      {
        title: "Anchor gift",
        amount: 1500,
        description: "A leadership gift toward fully funding the campaign goal.",
        donorCount: 2,
        spotsLeft: 6,
        perks: [
          "Tax credit receipt",
          "Thank-you note from family",
          "Campaign updates",
        ],
      },
    ],
  },
  {
    slug: "phoenix-grace-academy-campaign",
    title: "Chen Family — Phoenix Grace Academy",
    tagline: "Faith, Rigor, and Room to Grow",
    excerpt:
      "The Chen family is raising support so their daughter can continue at Phoenix Grace Academy—a Christ-centered school with strong academics and a caring community.",
    description:
      "Tuition remains the largest line item in their education budget. Tax-credit gifts through ACT help close the gap so she can stay enrolled, join clubs, and focus on learning instead of financial stress.",
    goal: 12000,
    raised: 4200,
    donorCount: 11,
    daysLeft: 44,
    endDate: "2026-07-01",
    image:
      "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=80",
    ],
    students: [
      {
        firstName: "Maya",
        lastName: "Chen",
        nickname: "May",
        gradeDisplay: "10th Grade",
        school: "Phoenix Grace Academy",
        photo:
          "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80",
        individualGoal: 4000,
        individualRaised: 1400,
      },
    ],
    school: {
      name: "Phoenix Grace Academy",
      address: "Phoenix, AZ",
      website: "https://example.org/",
    },
    parent: {
      name: "David Chen",
      email: "dchen@example.com",
      phone: TEAM_PHONE,
    },
    breadcrumbCategory: "Families",
    browseSchoolTypes: ["High Schools", "Private Schools", "Scholarships", "STEM"],
    tags: ["Family campaign", "Phoenix", "Tax credit", "High school"],
    updatesCount: 0,
    givingLevels: [
      {
        title: "Classroom partner",
        amount: 200,
        description: "Helps with materials and a week of tuition support.",
        donorCount: 3,
        perks: ["Tax credit receipt", "Thank-you from family"],
      },
      {
        title: "Semester boost",
        amount: 1000,
        description: "Meaningful support toward the campaign goal.",
        donorCount: 2,
        perks: ["Tax credit receipt", "Thank-you from family"],
      },
    ],
  },
];

export function getCampaignBySlug(slug: string): Campaign | undefined {
  return MOCK_CAMPAIGNS.find((c) => c.slug === slug);
}

/** Fallback tiers when mock data omits `givingLevels`. */
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
