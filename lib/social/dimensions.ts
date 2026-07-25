/**
 * Social platform + medium canvas presets. Client-safe (no server-only / no React).
 * The composer sizes its canvas to the selected medium's pixel dimensions; the
 * block system (shared with email) renders inside it.
 */

export type SocialPlatform = "instagram" | "facebook" | "linkedin" | "twitter";

export type SocialMedium = {
  id: string;
  label: string;
  width: number;
  height: number;
};

export type SocialPlatformDef = {
  id: SocialPlatform;
  label: string;
  /** Brand accent for chips/preview framing. */
  accent: string;
  mediums: SocialMedium[];
};

export const SOCIAL_PLATFORMS: SocialPlatformDef[] = [
  {
    id: "instagram",
    label: "Instagram",
    accent: "#E1306C",
    mediums: [
      { id: "square", label: "Feed — Square", width: 1080, height: 1080 },
      { id: "portrait", label: "Feed — Portrait", width: 1080, height: 1350 },
      { id: "story", label: "Story / Reel", width: 1080, height: 1920 },
    ],
  },
  {
    id: "facebook",
    label: "Facebook",
    accent: "#1877F2",
    mediums: [
      { id: "feed", label: "Feed — Landscape", width: 1200, height: 630 },
      { id: "square", label: "Feed — Square", width: 1080, height: 1080 },
      { id: "story", label: "Story", width: 1080, height: 1920 },
    ],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    accent: "#0A66C2",
    mediums: [
      { id: "feed", label: "Feed — Landscape", width: 1200, height: 627 },
      { id: "square", label: "Feed — Square", width: 1080, height: 1080 },
    ],
  },
  {
    id: "twitter",
    label: "X (Twitter)",
    accent: "#111827",
    mediums: [
      { id: "feed", label: "Feed — Landscape", width: 1600, height: 900 },
      { id: "square", label: "Square", width: 1080, height: 1080 },
    ],
  },
];

export function getPlatform(id: string): SocialPlatformDef | undefined {
  return SOCIAL_PLATFORMS.find((p) => p.id === id);
}

export function getMedium(platformId: string, mediumId: string): SocialMedium | undefined {
  return getPlatform(platformId)?.mediums.find((m) => m.id === mediumId);
}

/** Default medium for a platform (first entry). */
export function defaultMedium(platformId: string): SocialMedium | undefined {
  return getPlatform(platformId)?.mediums[0];
}
