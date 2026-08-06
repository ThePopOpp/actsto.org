import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a US phone number for display as it is typed.
 *
 * "4803527598" → "(480) 352-7598". Formats progressively so the field reads
 * correctly mid-entry rather than only once complete, and leaves anything that
 * isn't a plain 10-digit US number alone — an extension or a country code
 * should survive being typed.
 */
export function formatUsPhone(input: string): string {
  const digits = input.replace(/\D/g, "")

  // Tolerate a leading country code without mangling it.
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits
  if (national.length > 10) return input

  if (national.length <= 3) return national
  if (national.length <= 6) return `(${national.slice(0, 3)}) ${national.slice(3)}`
  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
}

/**
 * Initials for an avatar fallback. "Jeremy Waters" → "JW".
 *
 * One name gives its first two letters; nothing usable gives "?". Used wherever
 * a person has no photo yet.
 */
export function initialsOf(fullName: string | null | undefined): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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
