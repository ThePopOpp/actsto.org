/** Icon keys mapped in `TeamMemberBioView` */
export type KeyAttributeIcon =
  | "shield"
  | "globe"
  | "activity"
  | "target"
  | "handshake"
  | "sparkles"
  | "workflow"
  | "messages-square"
  | "badge-check";

export type KeyAttribute = {
  icon: KeyAttributeIcon;
  title: string;
  description: string;
};

export type LeadershipMember = {
  slug: string;
  name: string;
  role: string;
  excerpt: string;
  bio: string;
  imageSrc: string;
  email: string;
  organization: string;
  stats: {
    campaignCount: number;
    tenureYears: number;
  };
  keyAttributes: KeyAttribute[];
  facebookUrl: string;
  linkedinUrl: string;
};

export const leadershipTeam: LeadershipMember[] = [
  {
    slug: "chris-leavitt",
    name: "Chris Leavitt",
    role: "CEO",
    organization: "Arizona Christian Tuition",
    stats: { campaignCount: 9, tenureYears: 5 },
    keyAttributes: [
      {
        icon: "target",
        title: "Strategic vision",
        description: "Sets direction for scholarships, growth, and family-first experiences.",
      },
      {
        icon: "handshake",
        title: "Partnerships",
        description: "Builds trusted relationships with schools, donors, and community leaders.",
      },
      {
        icon: "sparkles",
        title: "Mission alignment",
        description: "Keeps every initiative rooted in faith, transparency, and student impact.",
      },
    ],
    excerpt:
      "Chris leads ACT’s vision to connect Arizona families with Christian education through scholarships and clear, compassionate support.",
    bio: "Chris Leavitt serves as CEO of Arizona Christian Tuition, guiding strategy and partnerships so more families can access private Christian schooling. He is passionate about transparency, stewardship, and walking alongside parents from application to award.",
    imageSrc:
      "https://arizonachristiantuition.com/wp-content/uploads/2026/03/chris-leavitt-white-bg.png",
    email: "chris@arizonachristiantuition.com",
    facebookUrl: "https://www.facebook.com/arizonachristiantuition",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    slug: "scott-spaulding",
    name: "Scott Spaulding",
    role: "COO",
    organization: "Arizona Christian Tuition",
    stats: { campaignCount: 12, tenureYears: 4 },
    keyAttributes: [
      {
        icon: "workflow",
        title: "Operational excellence",
        description: "Streamlines workflows from donation to award with clear accountability.",
      },
      {
        icon: "messages-square",
        title: "Stakeholder care",
        description: "Champions responsive support for families, schools, and donors.",
      },
      {
        icon: "badge-check",
        title: "Compliance & quality",
        description: "Upholds ADOR rules, reporting, and dependable program execution.",
      },
    ],
    excerpt:
      "Scott oversees day-to-day operations, donor experience, and school relationships—keeping programs compliant and families informed.",
    bio: "Scott Spaulding, COO, focuses on operational excellence across Arizona Christian Tuition—from donation processing to scholarship timelines. His background helps ensure schools, parents, and donors receive dependable answers and smooth workflows.",
    imageSrc:
      "https://arizonachristiantuition.com/wp-content/uploads/2025/07/Scott-Spalding.png",
    email: "scott@arizonachristiantuition.com",
    facebookUrl: "https://www.facebook.com/arizonachristiantuition",
    linkedinUrl: "https://www.linkedin.com/",
  },
  {
    slug: "jeremy-waters",
    name: "Jeremy Waters",
    role: "CTO",
    organization: "Arizona Christian Tuition",
    stats: { campaignCount: 14, tenureYears: 3 },
    keyAttributes: [
      {
        icon: "shield",
        title: "Security",
        description: "Enterprise-minded safeguards for data, payments, and family privacy.",
      },
      {
        icon: "globe",
        title: "Accessibility",
        description: "Inclusive experiences so every user can navigate portals with confidence.",
      },
      {
        icon: "activity",
        title: "Scalability",
        description: "Architecture and tooling built to grow with campaigns and giving seasons.",
      },
    ],
    excerpt:
      "Jeremy builds and maintains the technology behind ACT’s portals, campaigns, and donor tools—secure, simple, and built for growth.",
    bio: "Jeremy Waters leads technology as CTO, shaping the platforms families and donors use every day. He prioritizes security, accessibility, and a calm user experience so ACT can scale its mission across Arizona.",
    imageSrc:
      "https://arizonachristiantuition.com/wp-content/uploads/2026/03/Jeremy-Waters.png",
    email: "jeremy@arizonachristiantuition.com",
    facebookUrl: "https://www.facebook.com/arizonachristiantuition",
    linkedinUrl: "https://www.linkedin.com/",
  },
];

export function getLeadershipMember(slug: string): LeadershipMember | undefined {
  return leadershipTeam.find((m) => m.slug === slug);
}
