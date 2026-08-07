/**
 * The template catalogue: starting points for each media type, built from a
 * campaign and a design variant.
 *
 * A template is a *function*, not a stored document. It runs against the live
 * campaign, so the totals and the student's name are right on the day you open
 * it rather than whenever someone last saved a preset. Once applied, the blocks
 * are yours — the builder edits them freely and nothing writes back here.
 *
 * Every media type ends with a blank entry, because "fully custom" has to be a
 * first-class starting point rather than the thing you get by deleting a
 * template's blocks one at a time.
 */

import type { BlogBlock, BlogBlockProps, BlogBlockType } from "@/lib/blog/blocks";
import { formatMoney, type MarketingContent } from "@/lib/marketing/campaign-content";
import type { MarketingVariant } from "@/lib/marketing/design-variants";
import type { MediaTypeId } from "@/lib/marketing/media-types";

export type MediaTemplate = {
  id: string;
  mediaType: MediaTypeId;
  name: string;
  description: string;
  /** Blank templates render an empty canvas and a nudge to add a block. */
  blank?: boolean;
  build: (content: MarketingContent, variant: MarketingVariant) => BlogBlock[];
};

/**
 * Ids are derived from the template and index rather than random, so applying
 * the same template twice produces the same document and React keys stay put.
 */
function block(templateId: string, index: number, type: BlogBlockType, props: BlogBlockProps): BlogBlock {
  return { id: `${templateId}-${index}`, type, props };
}

/** Builds a document from a compact [type, props] list. */
function doc(templateId: string, parts: [BlogBlockType, BlogBlockProps][]): BlogBlock[] {
  return parts.map(([type, props], i) => block(templateId, i, type, props));
}

// ── Postcards ────────────────────────────────────────────────────────────────
// Type sits on the variant's dark fill, so colours are set explicitly rather
// than inherited — the block defaults assume a white page.

const POSTCARD_TEMPLATES: MediaTemplate[] = [
  {
    id: "postcard-photo-hero",
    mediaType: "postcard",
    name: "Photo hero",
    description: "The student's photo up top, headline and a single ask beneath.",
    build: (c, v) =>
      doc("postcard-photo-hero", [
        ["image", { src: c.imageUrl, alt: c.title, imgWidth: "100%", align: "center", marginBottom: 16 }],
        [
          "heading",
          {
            level: "h2",
            content: c.title,
            align: "left",
            color: "#ffffff",
            fontFamily: v.headingFont,
            fontSize: 36,
            marginBottom: 8,
          },
        ],
        ["paragraph", { content: c.tagline || c.excerpt, align: "left", color: "#e8ecf3", fontSize: 20, marginBottom: 16 }],
        [
          "button",
          {
            buttonText: "Give today",
            buttonUrl: c.donateUrl,
            buttonBgColor: v.accent,
            buttonColor: v.accentInk,
            align: "left",
          },
        ],
      ]),
  },
  {
    id: "postcard-progress",
    mediaType: "postcard",
    name: "Progress focus",
    description: "Leads with the numbers — how much is raised and what's left.",
    build: (c, v) =>
      doc("postcard-progress", [
        [
          "heading",
          {
            level: "h2",
            content: `${formatMoney(c.remaining)} to go`,
            align: "center",
            color: "#ffffff",
            fontFamily: v.headingFont,
            fontSize: 48,
            marginBottom: 4,
          },
        ],
        [
          "paragraph",
          {
            content: `${formatMoney(c.raised)} raised of ${formatMoney(c.goal)} · ${c.donorCount} supporters`,
            align: "center",
            color: "#c9d3e2",
            fontSize: 19,
            marginBottom: 16,
          },
        ],
        ["image", { src: c.imageUrl, alt: c.title, imgWidth: "100%", align: "center", marginBottom: 16 }],
        [
          "paragraph",
          {
            content: `Help ${c.studentFirstName} finish the year at ${c.schoolName}.`,
            align: "center",
            color: "#ffffff",
            fontSize: 20,
            marginBottom: 14,
          },
        ],
        [
          "button",
          {
            buttonText: "Close the gap",
            buttonUrl: c.donateUrl,
            buttonBgColor: v.accent,
            buttonColor: v.accentInk,
            align: "center",
          },
        ],
      ]),
  },
  {
    id: "postcard-tax-credit",
    mediaType: "postcard",
    name: "Tax-credit explainer",
    description: "For people who've never given through the Arizona credit.",
    build: (c, v) =>
      doc("postcard-tax-credit", [
        [
          "heading",
          {
            level: "h2",
            content: "Redirect your Arizona taxes",
            align: "left",
            color: "#ffffff",
            fontFamily: v.headingFont,
            fontSize: 36,
            marginBottom: 10,
          },
        ],
        [
          "paragraph",
          {
            content:
              "Arizona lets you send a portion of the state tax you already owe to a student's tuition, and claim it back dollar-for-dollar.",
            align: "left",
            color: "#e8ecf3",
            fontSize: 19,
            marginBottom: 14,
          },
        ],
        [
          "columns",
          {
            col1: `<strong>Student</strong><br />${c.studentFirstName}`,
            col2: `<strong>School</strong><br />${c.schoolName}`,
            colGap: 20,
            color: "#e8ecf3",
            marginBottom: 16,
          },
        ],
        [
          "button",
          {
            buttonText: "See how it works",
            buttonUrl: c.url,
            buttonBgColor: v.accent,
            buttonColor: v.accentInk,
            align: "left",
          },
        ],
      ]),
  },
  {
    id: "postcard-blank",
    mediaType: "postcard",
    name: "Blank postcard",
    description: "Start from nothing and build it block by block.",
    blank: true,
    build: () => [],
  },
];

// ── Emails ───────────────────────────────────────────────────────────────────
// White page, so block defaults apply and only the accent needs setting.

const EMAIL_TEMPLATES: MediaTemplate[] = [
  {
    id: "email-announcement",
    mediaType: "email",
    name: "Campaign announcement",
    description: "Introduces the student and asks for a first look.",
    build: (c, v) =>
      doc("email-announcement", [
        ["image", { src: c.imageUrl, alt: c.title, imgWidth: "100%", align: "center" }],
        ["heading", { level: "h1", content: c.title, align: "left", fontFamily: v.headingFont }],
        ["paragraph", { content: "Hi friends —", align: "left" }],
        ["paragraph", { content: c.excerpt, align: "left" }],
        ["paragraph", { content: c.description, align: "left" }],
        [
          "button",
          {
            buttonText: "See the campaign",
            buttonUrl: c.donateUrl,
            buttonBgColor: v.accent,
            buttonColor: v.accentInk,
            align: "left",
          },
        ],
        ["paragraph", { content: `With gratitude,<br /><strong>${c.parentName}</strong>`, align: "left" }],
      ]),
  },
  {
    id: "email-progress",
    mediaType: "email",
    name: "Progress update",
    description: "How far the campaign has come and what's still left.",
    build: (c, v) =>
      doc("email-progress", [
        [
          "heading",
          { level: "h1", content: `We're ${c.percent}% of the way there`, align: "left", fontFamily: v.headingFont },
        ],
        [
          "paragraph",
          {
            content: `${formatMoney(c.raised)} raised of ${formatMoney(c.goal)} from ${c.donorCount} supporters.`,
            align: "left",
          },
        ],
        ["image", { src: c.imageUrl, alt: c.title, imgWidth: "100%", align: "center" }],
        [
          "paragraph",
          {
            content: `That leaves ${formatMoney(c.remaining)} to go${c.daysLeft > 0 ? `, with ${c.daysLeft} days left` : ""}. If you've been meaning to give, now's a good moment.`,
            align: "left",
          },
        ],
        [
          "button",
          {
            buttonText: "Give toward the goal",
            buttonUrl: c.donateUrl,
            buttonBgColor: v.accent,
            buttonColor: v.accentInk,
            align: "left",
          },
        ],
      ]),
  },
  {
    id: "email-final-push",
    mediaType: "email",
    name: "Final push",
    description: "Names the deadline and the exact gap remaining.",
    build: (c, v) =>
      doc("email-final-push", [
        [
          "heading",
          { level: "h1", content: `${formatMoney(c.remaining)} to go`, align: "left", fontFamily: v.headingFont },
        ],
        [
          "paragraph",
          {
            content: `${c.studentFirstName}'s campaign closes ${c.daysLeft > 0 ? `in ${c.daysLeft} ${c.daysLeft === 1 ? "day" : "days"}` : "today"}, and we're ${formatMoney(c.remaining)} short of the ${formatMoney(c.goal)} goal.`,
            align: "left",
          },
        ],
        ["paragraph", { content: "We're genuinely close. Thank you for carrying this with us.", align: "left" }],
        [
          "button",
          {
            buttonText: "Close the gap",
            buttonUrl: c.donateUrl,
            buttonBgColor: v.accent,
            buttonColor: v.accentInk,
            align: "left",
          },
        ],
      ]),
  },
  {
    id: "email-thank-you",
    mediaType: "email",
    name: "Thank you",
    description: "Thanks everyone who gave and says what their gift did.",
    build: (c, v) =>
      doc("email-thank-you", [
        ["heading", { level: "h1", content: "You did this", align: "left", fontFamily: v.headingFont }],
        [
          "paragraph",
          {
            content: `${c.donorCount} ${c.donorCount === 1 ? "person" : "people"} gave to ${c.studentFirstName}'s campaign, and together you raised ${formatMoney(c.raised)}.`,
            align: "left",
          },
        ],
        ["image", { src: c.imageUrl, alt: c.title, imgWidth: "100%", align: "center" }],
        [
          "paragraph",
          {
            content: `That's a seat in a classroom at ${c.schoolName}, and a year ${c.studentFirstName} gets to spend learning instead of worrying about whether it's possible.`,
            align: "left",
          },
        ],
        ["paragraph", { content: `We're grateful. Truly.<br /><strong>${c.parentName}</strong>`, align: "left" }],
        // Still links back: people forward a thank-you, and the person it lands
        // on may not have seen the campaign at all.
        [
          "button",
          {
            buttonText: "See the campaign",
            buttonUrl: c.url,
            buttonBgColor: v.accent,
            buttonColor: v.accentInk,
            align: "left",
          },
        ],
      ]),
  },
  {
    id: "email-blank",
    mediaType: "email",
    name: "Blank email",
    description: "Start from nothing and build it block by block.",
    blank: true,
    build: () => [],
  },
];

// ── Social ───────────────────────────────────────────────────────────────────

const SOCIAL_TEMPLATES: MediaTemplate[] = [
  {
    id: "social-photo",
    mediaType: "social",
    name: "Photo post",
    description: "Photo, headline, one line of context, and the ask.",
    build: (c, v) =>
      doc("social-photo", [
        ["image", { src: c.imageUrl, alt: c.title, imgWidth: "100%", align: "center", marginBottom: 18 }],
        [
          "heading",
          {
            level: "h2",
            content: c.title,
            align: "left",
            color: "#ffffff",
            fontFamily: v.headingFont,
            fontSize: 40,
            marginBottom: 8,
          },
        ],
        ["paragraph", { content: c.tagline || c.excerpt, align: "left", color: "#e8ecf3", fontSize: 21, marginBottom: 18 }],
        [
          "button",
          {
            buttonText: "Give today",
            buttonUrl: c.donateUrl,
            buttonBgColor: v.accent,
            buttonColor: v.accentInk,
            align: "left",
          },
        ],
      ]),
  },
  {
    id: "social-progress",
    mediaType: "social",
    name: "Progress card",
    description: "Big number, short context. Made to stop a thumb.",
    build: (c, v) =>
      doc("social-progress", [
        [
          "heading",
          {
            level: "h1",
            content: `${c.percent}%`,
            align: "center",
            color: "#ffffff",
            fontFamily: v.headingFont,
            fontSize: 104,
            marginBottom: 0,
          },
        ],
        [
          "paragraph",
          {
            content: `of the way to ${formatMoney(c.goal)}`,
            align: "center",
            color: "#c9d3e2",
            fontSize: 22,
            marginBottom: 24,
          },
        ],
        [
          "heading",
          {
            level: "h3",
            content: `Help ${c.studentFirstName} finish the year`,
            align: "center",
            color: "#ffffff",
            fontFamily: v.headingFont,
            fontSize: 32,
            marginBottom: 20,
          },
        ],
        [
          "button",
          {
            buttonText: "Give today",
            buttonUrl: c.donateUrl,
            buttonBgColor: v.accent,
            buttonColor: v.accentInk,
            align: "center",
          },
        ],
      ]),
  },
  {
    id: "social-quote",
    mediaType: "social",
    name: "Quote card",
    description: "A line from the family's story, set as a pull quote.",
    build: (c, v) =>
      doc("social-quote", [
        [
          "quote",
          {
            content: c.tagline || c.excerpt,
            author: c.parentName,
            align: "left",
            color: "#ffffff",
            marginBottom: 24,
          },
        ],
        ["image", { src: c.imageUrl, alt: c.title, imgWidth: "100%", align: "center", marginBottom: 20 }],
        [
          "button",
          {
            buttonText: "Read their story",
            buttonUrl: c.url,
            buttonBgColor: v.accent,
            buttonColor: v.accentInk,
            align: "left",
          },
        ],
      ]),
  },
  {
    id: "social-blank",
    mediaType: "social",
    name: "Blank post",
    description: "Start from nothing and build it block by block.",
    blank: true,
    build: () => [],
  },
];

export const MEDIA_TEMPLATES: MediaTemplate[] = [
  ...POSTCARD_TEMPLATES,
  ...EMAIL_TEMPLATES,
  ...SOCIAL_TEMPLATES,
];

export function templatesFor(mediaType: MediaTypeId): MediaTemplate[] {
  return MEDIA_TEMPLATES.filter((t) => t.mediaType === mediaType);
}

export function getMediaTemplate(id: string | null | undefined): MediaTemplate | null {
  return MEDIA_TEMPLATES.find((t) => t.id === id) ?? null;
}
