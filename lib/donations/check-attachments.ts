import "server-only";

import { randomUUID } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/server";

/**
 * Scans of checks and the letters that come with them.
 *
 * A check image carries the donor's bank routing and account numbers, so:
 *   1. The bucket is private and asserted private on first use. No public URL
 *      is ever generated.
 *   2. Files are served only through a short-lived signed URL minted after a
 *      Super Admin check (see the attachment route), never in donor views.
 *   3. Every file carries a purge date: four years after the end of the tax
 *      year it supports (the STO supporting-document rule), unless an audit
 *      hold is set on the row.
 *
 * Staff should crop or cover the account-number line before uploading.
 */

export const CHECK_BUCKET = "donation-documents";
export const CHECK_MAX_BYTES = 10 * 1024 * 1024;
export const CHECK_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const CHECK_SIGNED_URL_TTL_SECONDS = 10 * 60;
const RETENTION_YEARS = Math.max(4, Number(process.env.DONATION_DOC_RETENTION_YEARS ?? 4) || 4);

/** Dec 31 of the year RETENTION_YEARS after the tax year ends. */
export function checkPurgeAfter(taxYear: number): Date {
  return new Date(Date.UTC(taxYear + 1 + RETENTION_YEARS, 11, 31));
}

let bucketChecked = false;

async function ensureBucket(supabase: ReturnType<typeof createServiceClient>) {
  if (bucketChecked) return;
  const { data, error } = await supabase.storage.getBucket(CHECK_BUCKET);
  if (error || !data) {
    const created = await supabase.storage.createBucket(CHECK_BUCKET, {
      public: false,
      fileSizeLimit: `${CHECK_MAX_BYTES}`,
      allowedMimeTypes: CHECK_MIME_TYPES,
    });
    if (created.error) throw new Error(`Could not create the private bucket "${CHECK_BUCKET}": ${created.error.message}`);
  } else if (data.public) {
    throw new Error(
      `Storage bucket "${CHECK_BUCKET}" is public. Check images carry bank account numbers and must not be served publicly. Set it to private in Supabase before uploading.`,
    );
  }
  bucketChecked = true;
}

export function validateCheckFile(file: File): string | null {
  if (!CHECK_MIME_TYPES.includes(file.type)) return "Upload a JPG, PNG or PDF.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > CHECK_MAX_BYTES) return "That file is over 10MB.";
  return null;
}

export async function uploadCheckFile(donationId: string, file: File): Promise<string> {
  const supabase = createServiceClient();
  await ensureBucket(supabase);
  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const path = `checks/${donationId}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(CHECK_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function removeCheckFile(path: string) {
  const supabase = createServiceClient();
  await supabase.storage.from(CHECK_BUCKET).remove([path]);
}

export async function signedCheckFileUrl(path: string): Promise<string> {
  const supabase = createServiceClient();
  await ensureBucket(supabase);
  const { data, error } = await supabase.storage.from(CHECK_BUCKET).createSignedUrl(path, CHECK_SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not open the file.");
  return data.signedUrl;
}
