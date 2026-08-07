/**
 * Design variants shared by every marketing channel.
 *
 * One variant drives postcards, emails and social posts alike, so a family that
 * picks "Bold" once gets a set that looks like a set. The tokens are plain hex
 * and plain font stacks rather than the app's OKLCH theme variables, because
 * these values are inlined into email HTML — inboxes understand neither CSS
 * variables nor modern colour spaces.
 *
 * All three variants stay inside ACTSTO's palette (navy, red, paper). They vary
 * in *emphasis*, not in brand: how much of the frame the photo takes, how loud
 * the headline is, how much colour sits behind the type.
 */

export type MarketingVariantId = "photo-led" | "clean" | "bold";

export type MarketingVariant = {
  id: MarketingVariantId;
  name: string;
  /** One line, shown on the picker card. */
  description: string;
  /** Who it suits — helps a parent choose without previewing all three. */
  bestFor: string;

  /** Page/canvas behind the card. */
  canvas: string;
  /** The card itself. */
  surface: string;
  /** Solid band behind the hero copy. */
  band: string;
  bandInk: string;
  ink: string;
  inkSoft: string;
  line: string;
  accent: string;
  accentInk: string;

  /** How much room the campaign photo gets. */
  heroWeight: "dominant" | "balanced" | "accent";
  /** Pixel height of the hero image in email. */
  heroHeight: number;
  /** Small caps line above the headline. Empty means the variant omits it. */
  kicker: string;
  radius: number;
  /** Headline scale in email, px. */
  titleSize: number;
  /**
   * Fill for the postcard and social canvases.
   *
   * Separate from the email tokens because type on those canvases is always
   * white — a variant whose email surface is white (Clean) still needs a dark
   * field here, or the headline disappears.
   */
  canvasFill: { mode: "solid" | "gradient"; from: string; to: string };
  /** Serif for the two brand-forward variants; system sans for Clean. */
  headingFont: string;
  bodyFont: string;
};

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const MARKETING_VARIANTS: MarketingVariant[] = [
  {
    id: "photo-led",
    name: "Photo-led",
    description: "The student's photo carries the piece; type stays out of its way.",
    bestFor: "Campaigns with one strong, well-lit photo.",
    canvas: "#f5f6f8",
    surface: "#ffffff",
    band: "#001138",
    bandInk: "#ffffff",
    ink: "#131c2b",
    inkSoft: "#5b6879",
    line: "#e4e8ee",
    accent: "#b21e2a",
    accentInk: "#ffffff",
    heroWeight: "dominant",
    heroHeight: 320,
    kicker: "",
    radius: 14,
    titleSize: 30,
    canvasFill: { mode: "gradient", from: "#001138", to: "#0f234e" },
    headingFont: SERIF,
    bodyFont: SANS,
  },
  {
    id: "clean",
    name: "Clean",
    description: "White, typographic and restrained — reads well in any inbox.",
    bestFor: "Business donors, school lists, and anyone forwarding to work.",
    canvas: "#ffffff",
    surface: "#ffffff",
    band: "#ffffff",
    bandInk: "#131c2b",
    ink: "#131c2b",
    inkSoft: "#5b6879",
    line: "#e4e8ee",
    accent: "#001138",
    accentInk: "#ffffff",
    heroWeight: "balanced",
    heroHeight: 200,
    kicker: "Arizona tax credit",
    radius: 8,
    titleSize: 26,
    canvasFill: { mode: "solid", from: "#001138", to: "#001138" },
    headingFont: SANS,
    bodyFont: SANS,
  },
  {
    id: "bold",
    name: "Bold",
    description: "Navy field, red accent, oversized headline. Hard to scroll past.",
    bestFor: "Final-push sends and social, where you need to stop a thumb.",
    canvas: "#001138",
    surface: "#0f234e",
    band: "#b21e2a",
    bandInk: "#ffffff",
    ink: "#ffffff",
    inkSoft: "#c3ccda",
    line: "#243a68",
    accent: "#f0b429",
    accentInk: "#001138",
    heroWeight: "accent",
    heroHeight: 180,
    kicker: "Give today",
    radius: 4,
    titleSize: 34,
    canvasFill: { mode: "gradient", from: "#b21e2a", to: "#001138" },
    headingFont: SERIF,
    bodyFont: SANS,
  },
];

export const DEFAULT_VARIANT_ID: MarketingVariantId = "photo-led";

export function getVariant(id: string | null | undefined): MarketingVariant {
  return (
    MARKETING_VARIANTS.find((v) => v.id === id) ??
    MARKETING_VARIANTS.find((v) => v.id === DEFAULT_VARIANT_ID)!
  );
}

/** Shared localStorage key so every tab reads the same choice. */
export const VARIANT_STORAGE_KEY = "actsto:marketing:variant";
