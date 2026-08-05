import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DOCUMENT_BUCKET,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_TYPES,
} from "@/lib/scholarship/constants";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Supporting documents for an overflow qualification claim.
 *
 * These are the most sensitive files in the system — disability determinations,
 * IEP and 504 plans, military orders, ESA contract records, much of it about
 * children. Three rules hold everywhere in this file:
 *
 *   1. The bucket is private. No public URL is ever generated, for any reason.
 *   2. Access is served through short-lived signed URLs, minted only after an
 *      authorization check, and every mint is logged.
 *   3. Every row carries a `purgeAfter` date set at upload time. The safest file
 *      is one we no longer store.
 */

/** Signed URLs live long enough to open a PDF, not long enough to share. */
export const SIGNED_URL_TTL_SECONDS = 10 * 60;

/**
 * Retention for the *file*. The verification metadata on the row outlives it.
 *
 * A floor of 12 months past submission, and long enough to clear the annual STO
 * audit for the award year. ACT's CPA gives the binding date — override this
 * with RETENTION_MONTHS once they have.
 *
 * Never purge before the audit covering that award year is complete.
 */
const RETENTION_MONTHS = Number(process.env.SCHOLARSHIP_DOC_RETENTION_MONTHS ?? 24);

/** Denied and withdrawn applications hold their files for a shorter period. */
const RETENTION_MONTHS_CLOSED = Number(
  process.env.SCHOLARSHIP_DOC_RETENTION_MONTHS_CLOSED ?? 12,
);

export function purgeAfterFor(from: Date = new Date(), months = RETENTION_MONTHS): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function purgeAfterForClosedApplication(from: Date = new Date()): Date {
  return purgeAfterFor(from, RETENTION_MONTHS_CLOSED);
}

export const RETENTION_SUMMARY = `We keep these files for ${RETENTION_MONTHS} months after your application is decided, then delete them. What we keep permanently is the record that a member of our team reviewed the document and what it showed — not the document itself.`;

// ── Bucket ───────────────────────────────────────────────────────────────────

let bucketChecked = false;

/**
 * Create the bucket on first use if it is missing, and assert it is private.
 *
 * The assertion matters more than the creation: a bucket that is flipped to
 * public in the Supabase dashboard would silently expose every uploaded IEP,
 * and nothing else in the system would notice.
 */
async function ensureBucket(supabase: ReturnType<typeof createServiceClient>) {
  if (bucketChecked) return;

  const { data, error } = await supabase.storage.getBucket(DOCUMENT_BUCKET);
  if (error || !data) {
    const created = await supabase.storage.createBucket(DOCUMENT_BUCKET, {
      public: false,
      fileSizeLimit: `${DOCUMENT_MAX_BYTES}`,
      allowedMimeTypes: DOCUMENT_MIME_TYPES,
    });
    if (created.error) {
      throw new Error(
        `Could not create the private storage bucket "${DOCUMENT_BUCKET}": ${created.error.message}`,
      );
    }
  } else if (data.public) {
    throw new Error(
      `Storage bucket "${DOCUMENT_BUCKET}" is public. Application documents contain student disability and family records and must not be served publicly. Set it to private in Supabase before uploads can continue.`,
    );
  }

  bucketChecked = true;
}

// ── Upload ───────────────────────────────────────────────────────────────────

export type UploadResult =
  | { ok: true; storagePath: string }
  | { ok: false; error: string };

export function validateUpload(file: File): string | null {
  if (!DOCUMENT_MIME_TYPES.includes(file.type)) {
    return "That file type isn't supported. Upload a JPG, PNG, or PDF.";
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    const mb = Math.round(DOCUMENT_MAX_BYTES / (1024 * 1024));
    return `That file is too large. Each file has to be ${mb}MB or smaller.`;
  }
  if (file.size === 0) {
    return "That file is empty.";
  }
  return null;
}

function safeExtension(fileName: string, mimeType: string): string {
  const fromName = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 5) return fromName;
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  return "jpg";
}

export async function uploadApplicationDocument(
  applicationId: string,
  file: File,
): Promise<UploadResult> {
  const invalid = validateUpload(file);
  if (invalid) return { ok: false, error: invalid };

  const supabase = createServiceClient();
  try {
    await ensureBucket(supabase);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Storage unavailable." };
  }

  const storagePath = `applications/${applicationId}/${crypto.randomUUID()}.${safeExtension(
    file.name,
    file.type,
  )}`;

  const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
    // Private bucket; no CDN caching of family records.
    cacheControl: "0",
  });

  if (error) {
    return { ok: false, error: `Upload failed: ${error.message}` };
  }
  return { ok: true, storagePath };
}

// ── Signed URLs ──────────────────────────────────────────────────────────────

/**
 * Mint a short-lived signed URL. Call only after an authorization check —
 * this function does not perform one, by design, because the parent path and
 * the staff path authorize differently.
 */
export async function createSignedDocumentUrl(storagePath: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

// ── Deletion and purge ───────────────────────────────────────────────────────

/**
 * Remove a storage object, but only when no other live row still points at it.
 *
 * Documents imported onto a resubmission deliberately share one storage object
 * with the denied attempt they came from — the family should not re-upload an
 * IEP because of a paperwork outcome. Deleting the object out from under the
 * other row would break it.
 */
export async function deleteStorageObjectIfOrphaned(
  storagePath: string,
  excludeDocumentId: string,
): Promise<{ deleted: boolean; error?: string }> {
  const stillReferenced = await prisma.applicationDocument.count({
    where: { storagePath, purgedAt: null, id: { not: excludeDocumentId } },
  });
  if (stillReferenced > 0) return { deleted: false };

  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
  if (error) return { deleted: false, error: error.message };
  return { deleted: true };
}

// ── Access logging ───────────────────────────────────────────────────────────

export type DocumentAccessAction = "signed_url" | "download" | "delete" | "denied" | "purge";

/**
 * Log every touch of a document: who, when, which file. If a family ever asks
 * who saw their child's IEP, this is how we answer precisely.
 *
 * Never throws — a logging failure must not deny a legitimate staff member
 * access, but it also must not pass silently, so it warns.
 */
export async function logDocumentAccess(args: {
  documentId: string;
  accessedBy?: string | null;
  accessorEmail?: string | null;
  action: DocumentAccessAction;
  ip?: string | null;
}): Promise<void> {
  try {
    await prisma.documentAccessLog.create({
      data: {
        documentId: args.documentId,
        accessedBy: args.accessedBy ?? null,
        accessorEmail: args.accessorEmail ?? null,
        action: args.action,
        ip: args.ip ?? null,
      },
    });
  } catch (error) {
    console.warn("[scholarship] document access log failed", {
      documentId: args.documentId,
      action: args.action,
      error,
    });
  }
}

/** Best-effort client IP from the proxy headers Vercel and Hostinger set. */
export function requestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}
