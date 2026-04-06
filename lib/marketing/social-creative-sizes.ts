export type SocialNetwork = "facebook" | "instagram";

export type SocialFormatPreset = {
  id: string;
  network: SocialNetwork;
  /** Display label */
  label: string;
  /** Recommended export width (px) */
  widthPx: number;
  /** Recommended export height (px) */
  heightPx: number;
  /** Short description for tooltips / help */
  hint: string;
  /** When true, UI can show story safe-zone guides (9:16) */
  isVerticalStory: boolean;
};

/**
 * Pixel sizes follow common Meta / platform guidance for feed, vertical, and 9:16 placements.
 * Always verify current specs before final ad export.
 */
export const SOCIAL_FORMAT_PRESETS: SocialFormatPreset[] = [
  // Facebook
  {
    id: "fb-feed-square",
    network: "facebook",
    label: "Feed — Square (1:1)",
    widthPx: 1080,
    heightPx: 1080,
    hint: "Classic square feed image — 1080×1080 px.",
    isVerticalStory: false,
  },
  {
    id: "fb-feed-landscape",
    network: "facebook",
    label: "Feed — Landscape (1.91:1)",
    widthPx: 1200,
    heightPx: 630,
    hint: "Link-style landscape card — 1200×630 px.",
    isVerticalStory: false,
  },
  {
    id: "fb-feed-vertical",
    network: "facebook",
    label: "Feed — Vertical (4:5)",
    widthPx: 1080,
    heightPx: 1350,
    hint: "Taller feed placement — 1080×1350 px.",
    isVerticalStory: false,
  },
  {
    id: "fb-story-reels",
    network: "facebook",
    label: "Stories / Reels (9:16)",
    widthPx: 1080,
    heightPx: 1920,
    hint: "Full-screen vertical — 1080×1920 px. Keep text inside safe margins.",
    isVerticalStory: true,
  },
  // Instagram
  {
    id: "ig-feed-square",
    network: "instagram",
    label: "Feed — Square (1:1)",
    widthPx: 1080,
    heightPx: 1080,
    hint: "Instagram square post — 1080×1080 px.",
    isVerticalStory: false,
  },
  {
    id: "ig-feed-portrait",
    network: "instagram",
    label: "Feed — Portrait (4:5)",
    widthPx: 1080,
    heightPx: 1350,
    hint: "Max height in home feed — 1080×1350 px.",
    isVerticalStory: false,
  },
  {
    id: "ig-feed-landscape",
    network: "instagram",
    label: "Feed — Landscape (≈1.91:1)",
    widthPx: 1080,
    heightPx: 566,
    hint: "Horizontal feed — 1080×566 px (≈1.91:1).",
    isVerticalStory: false,
  },
  {
    id: "ig-story-reels",
    network: "instagram",
    label: "Stories / Reels (9:16)",
    widthPx: 1080,
    heightPx: 1920,
    hint: "Stories & Reels — 1080×1920 px. Use safe zones for UI overlays.",
    isVerticalStory: true,
  },
];

export function presetsForNetwork(network: SocialNetwork): SocialFormatPreset[] {
  return SOCIAL_FORMAT_PRESETS.filter((p) => p.network === network);
}

export function getSocialPreset(id: string): SocialFormatPreset | undefined {
  return SOCIAL_FORMAT_PRESETS.find((p) => p.id === id);
}
