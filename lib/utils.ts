import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Where to anchor a cropped photo of people.
 *
 * Campaign photos are family and student portraits, but the cards and hero
 * force a wide box (16/10, 16/9), so `object-cover` throws away the top and
 * bottom. Anchoring at the centre puts the crop across torsos and slices heads
 * off — faces sit in the upper third of almost every photo a family submits.
 *
 * 30% from the top keeps faces in frame without cutting chins on photos that
 * genuinely are centred. Use this anywhere a person's photo is cropped to a
 * fixed aspect ratio.
 *
 * This is a heuristic, not a substitute for a per-image focal point. If it
 * still misses on some photos, the fix is letting the uploader place the focal
 * point rather than nudging this number.
 */
export const FACE_SAFE_CROP = "object-[50%_30%]"

/** USD for checkout CTAs (always two decimals), e.g. $250.00 */
export function formatCheckoutUsd(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}
