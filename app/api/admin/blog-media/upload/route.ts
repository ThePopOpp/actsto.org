import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "blog-media";
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "video/ogg",
];

function kindOf(mime: string): "image" | "audio" | "video" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return null;
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A media file is required." }, { status: 400 });
  }
  const kind = kindOf(file.type);
  if (!kind || !ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type. Use an image, audio, or video file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be 25MB or smaller." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${kind}/${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

  const supabase = createServiceClient();
  const bucket = await supabase.storage.getBucket(BUCKET);
  if (bucket.error) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: `${MAX_BYTES}`,
      allowedMimeTypes: ALLOWED_MIME,
    });
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return NextResponse.json(
      { error: `${error.message} Check the Supabase Storage bucket named ${BUCKET}.` },
      { status: 500 },
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path, kind });
}
