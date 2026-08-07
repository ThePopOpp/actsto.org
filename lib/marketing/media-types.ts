/**
 * The media types a campaign can be marketed with, and the canvas each one
 * renders onto.
 *
 * All three share the block document model from `lib/blog/blocks` — the same
 * one the email template editor uses — so a postcard, an email and a social
 * post are the same kind of object with different page sizes. That's what lets
 * one builder serve all three instead of three builders drifting apart.
 */

import type { BlogBlockType } from "@/lib/blog/blocks";

export type MediaTypeId = "postcard" | "email" | "social";

export type MediaCanvas = {
  id: string;
  label: string;
  /** Real-world pixels at print/export resolution. Drives the aspect ratio. */
  widthPx: number;
  heightPx: number;
  /** Extra note shown under the size picker. */
  hint?: string;
};

export type MediaTypeDef = {
  id: MediaTypeId;
  label: string;
  /** Plural, for headings like "Postcard templates". */
  description: string;
  canvases: MediaCanvas[];
  /** Blocks offered in the palette. Audio in a postcard would be nonsense. */
  blocks: BlogBlockType[];
  /**
   * Fixed-aspect media (postcard, social) crop to the canvas; email flows to
   * whatever height the content needs.
   */
  fixedAspect: boolean;
  /** Document width in CSS px inside the canvas. */
  contentWidth: number;
  /** Whether the canvas sits on the design variant's dark fill. */
  darkCanvas: boolean;
};

const PRINT_BLOCKS: BlogBlockType[] = [
  "heading",
  "paragraph",
  "image",
  "button",
  "divider",
  "spacer",
  "columns",
  "quote",
];

export const MEDIA_TYPES: MediaTypeDef[] = [
  {
    id: "postcard",
    label: "Postcards",
    description: "Digital and print postcards, front and back.",
    canvases: [
      { id: "4.25x5.5", label: '4.25" × 5.5"', widthPx: 1275, heightPx: 1650, hint: "USPS postcard rate" },
      { id: "6x4", label: '6" × 4"', widthPx: 1800, heightPx: 1200, hint: "Standard landscape" },
      { id: "6x9", label: '6" × 9"', widthPx: 1800, heightPx: 2700, hint: "Oversized, first-class" },
      { id: "5x7", label: '5" × 7"', widthPx: 1500, heightPx: 2100 },
    ],
    blocks: PRINT_BLOCKS,
    fixedAspect: true,
    contentWidth: 520,
    darkCanvas: true,
  },
  {
    id: "email",
    label: "Emails",
    description: "Ready-to-send emails you can copy into any mail tool.",
    canvases: [{ id: "email-600", label: "600px (standard)", widthPx: 600, heightPx: 0 }],
    blocks: [
      "heading",
      "paragraph",
      "image",
      "gallery",
      "quote",
      "button",
      "columns",
      "columns3",
      "divider",
      "spacer",
    ],
    fixedAspect: false,
    contentWidth: 600,
    darkCanvas: false,
  },
  {
    id: "social",
    label: "Social",
    description: "Feed posts and stories for Facebook, Instagram and LinkedIn.",
    canvases: [
      { id: "feed-square", label: "Square 1080 × 1080", widthPx: 1080, heightPx: 1080, hint: "Feed, all networks" },
      { id: "feed-portrait", label: "Portrait 1080 × 1350", widthPx: 1080, heightPx: 1350, hint: "Best feed reach" },
      { id: "story", label: "Story 1080 × 1920", widthPx: 1080, heightPx: 1920, hint: "Keep type clear of top/bottom" },
      { id: "landscape", label: "Landscape 1200 × 630", widthPx: 1200, heightPx: 630, hint: "Link previews" },
    ],
    blocks: PRINT_BLOCKS,
    fixedAspect: true,
    contentWidth: 520,
    darkCanvas: true,
  },
];

export function getMediaType(id: string | null | undefined): MediaTypeDef {
  return MEDIA_TYPES.find((m) => m.id === id) ?? MEDIA_TYPES[0];
}

export function getCanvas(type: MediaTypeDef, canvasId: string | null | undefined): MediaCanvas {
  return type.canvases.find((c) => c.id === canvasId) ?? type.canvases[0];
}
