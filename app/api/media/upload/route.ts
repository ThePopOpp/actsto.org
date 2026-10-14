import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "site-media";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

/**
 * POST /api/media/upload — multipart { file, folder? }
 *
 * The upload behind every image, logo, gallery and video field on the site
 * (components/ui/media-field.tsx). Any signed-in account may upload; files go
 * to the public `site-media` bucket under a random name. SVG is refused: it can
 * carry script, and these files are shown to the public.
 */
export async function POST(request: Request) {
  const session = await getActSession();
  if (!session) return NextResponse.json({ error: "Sign in to upload files." }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });

  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, WebP, GIF or AVIF image, or an MP4, WebM or MOV video." },
      { status: 400 },
    );
  }
  if (isImage && file.size > IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "Images must be 10 MB or smaller." }, { status: 400 });
  }
  if (isVideo && file.size > VIDEO_MAX_BYTES) {
    return NextResponse.json({ error: "Videos must be 50 MB or smaller. For longer videos, use a YouTube or Vimeo link." }, { status: 400 });
  }

  const rawFolder = formData?.get("folder");
  const folder = typeof rawFolder === "string" && /^[a-z0-9-]{1,40}$/.test(rawFolder) ? rawFolder : "uploads";
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (isVideo ? "mp4" : "jpg");
  const path = `${folder}/${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

  const supabase = createServiceClient();
  const bucket = await supabase.storage.getBucket(BUCKET);
  if (bucket.error) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: `${VIDEO_MAX_BYTES}`,
      allowedMimeTypes: [...IMAGE_TYPES, ...VIDEO_TYPES],
    });
  }
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("[media-upload]", error.message);
    return NextResponse.json({ error: "The file couldn't be saved. Try again, or use a link instead." }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path, kind: isVideo ? "video" : "image" });
}
