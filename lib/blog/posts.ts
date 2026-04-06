/**
 * Placeholder content shaped like WordPress REST `post` + common meta keys.
 * Mirrors `type: post`, `status: publish`, taxonomies (`wp:term`), featured media, Yoast-style meta.
 */

export type WPTaxonomyTerm = {
  id: number;
  name: string;
  slug: string;
  taxonomy: "category" | "post_tag";
};

export type WPFeaturedMedia = {
  id: number;
  source_url: string;
  alt_text: string;
  mime_type: string;
  media_details?: { width: number; height: number };
};

export type WPAuthor = {
  id: number;
  name: string;
  slug: string;
};

/** Yoast / common SEO plugin keys often exposed via `meta` or ACF */
export type WordPressPostMeta = {
  _yoast_wpseo_title?: string;
  _yoast_wpseo_metadesc?: string;
  _yoast_wpseo_canonical?: string;
  _yoast_wpseo_focuskw?: string;
};

export type WordPressPostContentSection = {
  heading?: string;
  paragraphs: string[];
};

export type WordPressPost = {
  id: number;
  /** REST: `type` — core post type */
  type: "post";
  /** REST: `status` */
  status: "publish";
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string; protected: boolean };
  /** Plain excerpt for cards (REST often HTML-strips client-side) */
  excerptPlain: string;
  content: { rendered: string; protected: boolean };
  /** Structured body for our UI (maps to `content.rendered` when synced from WP) */
  contentSections: WordPressPostContentSection[];
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  author: number;
  /** Embedded author object (would come from `_embed` in REST) */
  author_embed?: WPAuthor;
  featured_media: number;
  featured_media_embed: WPFeaturedMedia | null;
  categories: number[];
  tags: number[];
  /** Resolved terms (would come from `_embedded['wp:term']`) */
  terms: {
    category: WPTaxonomyTerm[];
    post_tag: WPTaxonomyTerm[];
  };
  meta: WordPressPostMeta;
};

const authorAct: WPAuthor = {
  id: 2,
  name: "Arizona Christian Tuition",
  slug: "arizona-christian-tuition",
};

const IMG_FAMILY =
  "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200&q=80";
const IMG_SCHOOL =
  "https://images.unsplash.com/photo-1580582932707-520aed937d17?w=1200&q=80";
const IMG_HANDS =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80";
const IMG_ARIZONA =
  "https://images.unsplash.com/photo-1575414723226-faadfaf7296d?w=1200&q=80";

export const BLOG_POSTS: WordPressPost[] = [
  {
    id: 101,
    type: "post",
    status: "publish",
    slug: "arizona-tax-credits-private-christian-school",
    title: { rendered: "How Arizona Tax Credits Help Families Afford Private Christian School" },
    excerpt: {
      rendered:
        "<p>A plain-language overview of Arizona&rsquo;s private school tax credit programs and how they work alongside a School Tuition Organization like ACT.</p>",
      protected: false,
    },
    excerptPlain:
      "A plain-language overview of Arizona's private school tax credit programs and how they work alongside a School Tuition Organization like ACT.",
    content: { rendered: "", protected: false },
    contentSections: [
      {
        paragraphs: [
          "Arizona offers several ways for taxpayers to redirect a portion of their state tax liability toward scholarships for private school students. When you give through a certified School Tuition Organization (STO), your gift can be eligible for a dollar-for-dollar tax credit—up to applicable annual limits for individual and corporate donors.",
          "For families, the practical outcome is straightforward: more students can attend a school that aligns with their values—without a separate “charity budget” beyond the taxes you already owe. ACT exists to make that pathway clear, compliant, and easy to navigate.",
        ],
      },
      {
        heading: "Original tax credit vs. overflow (plus switcher and corporate credits)",
        paragraphs: [
          "Many donors start with the individual original tuition tax credit, then use the overflow credit to give above that threshold where allowed by law. Switcher credits and corporate programs follow different rules and deadlines; your advisor or our team can help you stay within annual limits.",
          "This article is educational only. Limits and eligibility change; always confirm your situation with a qualified tax professional.",
        ],
      },
      {
        heading: "Why families choose ACT",
        paragraphs: [
          "We built Arizona Christian Tuition so Valley families could connect faithful education with predictable scholarship workflows—from campaign storytelling to receipts donors can use at tax time.",
        ],
      },
    ],
    date: "2025-11-12T15:00:00",
    date_gmt: "2025-11-12T15:00:00",
    modified: "2025-12-01T10:00:00",
    modified_gmt: "2025-12-01T10:00:00",
    author: authorAct.id,
    author_embed: authorAct,
    featured_media: 501,
    featured_media_embed: {
      id: 501,
      source_url: IMG_ARIZONA,
      alt_text: "Arizona desert landscape at sunset",
      mime_type: "image/jpeg",
      media_details: { width: 1200, height: 800 },
    },
    categories: [3],
    tags: [11, 12],
    terms: {
      category: [{ id: 3, name: "Tax credits", slug: "tax-credits", taxonomy: "category" }],
      post_tag: [
        { id: 11, name: "Families", slug: "families", taxonomy: "post_tag" },
        { id: 12, name: "FAQ", slug: "faq", taxonomy: "post_tag" },
      ],
    },
    meta: {
      _yoast_wpseo_title: "Arizona Tax Credits for Private Christian School | ACT",
      _yoast_wpseo_metadesc:
        "Learn how Arizona private school tax credits work with a School Tuition Organization and how ACT helps families and donors.",
      _yoast_wpseo_focuskw: "Arizona private school tax credit",
      _yoast_wpseo_canonical: "https://arizonachristiantuition.com/blog/arizona-tax-credits-private-christian-school/",
    },
  },
  {
    id: 102,
    type: "post",
    status: "publish",
    slug: "launch-tuition-campaign-checklist",
    title: { rendered: "Launching a Tuition Campaign: A Checklist for Parents" },
    excerpt: {
      rendered:
        "<p>From setting a goal to telling your story, use this checklist before you publish your family campaign on Arizona Christian Tuition.</p>",
      protected: false,
    },
    excerptPlain:
      "From setting a goal to telling your story, use this checklist before you publish your family campaign on Arizona Christian Tuition.",
    content: { rendered: "", protected: false },
    contentSections: [
      {
        paragraphs: [
          "Starting a campaign can feel overwhelming—you are balancing authenticity, privacy, and a clear ask. We recommend beginning with your “why,” then anchoring numbers (goal, timeline, school) so donors know exactly what success looks like.",
        ],
      },
      {
        heading: "Before you go live",
        paragraphs: [
          "Confirm your school and tuition window, choose a hero image that reflects your student (or family), and write a short tagline donors can remember. Double-check contact information so thank-yous and receipts route correctly.",
          "Set a realistic goal that matches your scholarship need and communicates momentum—donors like to see progress, not just a distant finish line.",
        ],
      },
      {
        heading: "After launch",
        paragraphs: [
          "Share your public page with a small circle first, gather feedback, then widen the circle. Update your story when milestones hit; recurring visibility keeps tax-credit giving top-of-mind during busy seasons.",
        ],
      },
    ],
    date: "2025-12-04T14:30:00",
    date_gmt: "2025-12-04T14:30:00",
    modified: "2025-12-05T09:00:00",
    modified_gmt: "2025-12-05T09:00:00",
    author: authorAct.id,
    author_embed: authorAct,
    featured_media: 502,
    featured_media_embed: {
      id: 502,
      source_url: IMG_FAMILY,
      alt_text: "Family walking together outdoors",
      mime_type: "image/jpeg",
      media_details: { width: 1200, height: 800 },
    },
    categories: [4],
    tags: [13, 14],
    terms: {
      category: [{ id: 4, name: "Campaigns", slug: "campaigns", taxonomy: "category" }],
      post_tag: [
        { id: 13, name: "Parents", slug: "parents", taxonomy: "post_tag" },
        { id: 14, name: "How-to", slug: "how-to", taxonomy: "post_tag" },
      ],
    },
    meta: {
      _yoast_wpseo_title: "Tuition Campaign Checklist for Parents | Arizona Christian Tuition",
      _yoast_wpseo_metadesc:
        "A practical checklist for Arizona families launching a private school tuition campaign on ACT.",
      _yoast_wpseo_focuskw: "tuition campaign",
      _yoast_wpseo_canonical: "https://arizonachristiantuition.com/blog/launch-tuition-campaign-checklist/",
    },
  },
  {
    id: 103,
    type: "post",
    status: "publish",
    slug: "donor-guide-sto-gifts-receipts",
    title: { rendered: "What Donors Should Know About STO Gifts and Receipts" },
    excerpt: {
      rendered:
        "<p>Corporate and individual donors: here is how recommendations, receipts, and timing typically work when you give through Arizona Christian Tuition.</p>",
      protected: false,
    },
    excerptPlain:
      "Corporate and individual donors: here is how recommendations, receipts, and timing typically work when you give through Arizona Christian Tuition.",
    content: { rendered: "", protected: false },
    contentSections: [
      {
        paragraphs: [
          "Tax-credit giving is powerful because it can align state liability with outcomes you care about—but the rules matter. STOs process gifts according to Arizona statutes and issue documentation donors use when filing.",
        ],
      },
      {
        heading: "Receipts and record-keeping",
        paragraphs: [
          "Keep your acknowledgement and any recommendation language provided at the time of your gift. Business donors may have additional reporting needs; finance teams often coordinate our invoice-style summaries with their ADOR workflows.",
        ],
      },
      {
        heading: "Corporate pledges and employee match",
        paragraphs: [
          "Many employers pair employee generosity with structured match windows. If you are exploring a corporate pledge, talk early with your finance lead about recognition timing and pledge fulfillment.",
        ],
      },
    ],
    date: "2025-12-19T11:00:00",
    date_gmt: "2025-12-19T11:00:00",
    modified: "2026-01-02T16:00:00",
    modified_gmt: "2026-01-02T16:00:00",
    author: authorAct.id,
    author_embed: authorAct,
    featured_media: 503,
    featured_media_embed: {
      id: 503,
      source_url: IMG_HANDS,
      alt_text: "Hands joined in collaboration",
      mime_type: "image/jpeg",
      media_details: { width: 1200, height: 800 },
    },
    categories: [5],
    tags: [15, 16],
    terms: {
      category: [{ id: 5, name: "For donors", slug: "for-donors", taxonomy: "category" }],
      post_tag: [
        { id: 15, name: "STO", slug: "sto", taxonomy: "post_tag" },
        { id: 16, name: "Receipts", slug: "receipts", taxonomy: "post_tag" },
      ],
    },
    meta: {
      _yoast_wpseo_title: "STO Gifts & Receipts for Donors | Arizona Christian Tuition",
      _yoast_wpseo_metadesc:
        "An overview of tax-credit gifts, documentation, and timing when you donate through ACT.",
      _yoast_wpseo_focuskw: "STO donation receipt",
      _yoast_wpseo_canonical: "https://arizonachristiantuition.com/blog/donor-guide-sto-gifts-receipts/",
    },
  },
  {
    id: 104,
    type: "post",
    status: "publish",
    slug: "schools-families-faith-centered-education",
    title: {
      rendered: "Partners in Education: Schools, Families, and Christ-Centered Learning in the Valley",
    },
    excerpt: {
      rendered:
        "<p>How STO scholarships, tuition campaigns, and local schools work together to keep students in classrooms that reflect their families&rsquo; faith.</p>",
      protected: false,
    },
    excerptPlain:
      "How STO scholarships, tuition campaigns, and local schools work together to keep students in classrooms that reflect their families' faith.",
    content: { rendered: "", protected: false },
    contentSections: [
      {
        paragraphs: [
          "Behind every campaign is a partnership: administrators who steward scholarships, teachers who invest in students, and families who prioritize character and conviction in addition to academics.",
        ],
      },
      {
        heading: "A shared goal",
        paragraphs: [
          "When donors recommend gifts and families share transparent goals, schools can plan with more certainty. That stability ripples into classrooms—better ratios, stronger programs, and more students who can remain enrolled through the year.",
        ],
      },
      {
        heading: "Get involved",
        paragraphs: [
          "Whether you are exploring a first-time gift or helping a family tell their story, ACT is here to connect the pieces—from public campaign pages to compliant scholarship workflows.",
        ],
      },
    ],
    date: "2026-01-16T09:45:00",
    date_gmt: "2026-01-16T09:45:00",
    modified: "2026-01-20T12:00:00",
    modified_gmt: "2026-01-20T12:00:00",
    author: authorAct.id,
    author_embed: authorAct,
    featured_media: 504,
    featured_media_embed: {
      id: 504,
      source_url: IMG_SCHOOL,
      alt_text: "Students in a learning environment",
      mime_type: "image/jpeg",
      media_details: { width: 1200, height: 800 },
    },
    categories: [6],
    tags: [17, 18],
    terms: {
      category: [{ id: 6, name: "Community", slug: "community", taxonomy: "category" }],
      post_tag: [
        { id: 17, name: "Christian education", slug: "christian-education", taxonomy: "post_tag" },
        { id: 18, name: "Valley schools", slug: "valley-schools", taxonomy: "post_tag" },
      ],
    },
    meta: {
      _yoast_wpseo_title: "Schools, Families & Faith-Centered Education | ACT",
      _yoast_wpseo_metadesc:
        "Why partnerships between STOs, families, and Christian schools matter in Arizona—and how ACT supports the Valley.",
      _yoast_wpseo_focuskw: "Christian school Arizona",
      _yoast_wpseo_canonical: "https://arizonachristiantuition.com/blog/schools-families-faith-centered-education/",
    },
  },
];

export function getPublishedPosts(): WordPressPost[] {
  return [...BLOG_POSTS]
    .filter((p) => p.status === "publish")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): WordPressPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getAllPostSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug);
}
