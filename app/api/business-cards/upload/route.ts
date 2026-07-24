import { NextResponse } from "next/server";

import { requireDashboardApi } from "@/lib/auth/require-dashboard-api";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "card-media";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];

export async function POST(request: Request) {
  const auth = await requireDashboardApi();
  if (!auth.ok) return auth.response;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "An image file is required." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `cards/${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const supabase = createServiceClient();
  const bucket = await supabase.storage.getBucket(BUCKET);
  if (bucket.error) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: `${MAX_BYTES}`,
      allowedMimeTypes: ALLOWED,
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
  return NextResponse.json({ url: data.publicUrl, path });
}
