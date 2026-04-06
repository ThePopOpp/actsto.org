export type PostcardSizeId =
  | "4.25x5.5"
  | "4x6"
  | "5x7"
  | "5.5x8.5"
  | "4x9"
  | "6x9"
  | "3.5x5"
  | "3.5x8.5"
  | "2.125x5.5"
  | "4x12";

export type PostcardSizeOption = {
  id: PostcardSizeId;
  label: string;
  /** Width in inches (horizontal edge when portrait is height > width). */
  widthIn: number;
  /** Height in inches */
  heightIn: number;
};

/** Standard fundraising postcard sizes (US). */
export const POSTCARD_SIZE_OPTIONS: PostcardSizeOption[] = [
  { id: "4.25x5.5", label: `4.25" × 5.5"`, widthIn: 4.25, heightIn: 5.5 },
  { id: "4x6", label: `4" × 6"`, widthIn: 4, heightIn: 6 },
  { id: "5x7", label: `5" × 7"`, widthIn: 5, heightIn: 7 },
  { id: "5.5x8.5", label: `5.5" × 8.5"`, widthIn: 5.5, heightIn: 8.5 },
  { id: "4x9", label: `4" × 9"`, widthIn: 4, heightIn: 9 },
  { id: "6x9", label: `6" × 9"`, widthIn: 6, heightIn: 9 },
  { id: "3.5x5", label: `3.5" × 5"`, widthIn: 3.5, heightIn: 5 },
  { id: "3.5x8.5", label: `3.5" × 8.5"`, widthIn: 3.5, heightIn: 8.5 },
  { id: "2.125x5.5", label: `2.125" × 5.5"`, widthIn: 2.125, heightIn: 5.5 },
  { id: "4x12", label: `4" × 12"`, widthIn: 4, heightIn: 12 },
];

export function getPostcardSize(id: PostcardSizeId): PostcardSizeOption {
  return POSTCARD_SIZE_OPTIONS.find((o) => o.id === id) ?? POSTCARD_SIZE_OPTIONS[0]!;
}
