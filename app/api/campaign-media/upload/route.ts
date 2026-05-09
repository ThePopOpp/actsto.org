import { NextResponse } from "next/server";

import { getActSession } from "@/lib/auth/session-server";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "campaign-media";
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getActSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `campaigns/${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const supabase = createServiceClient();
  const bucket = await supabase.storage.getBucket(BUCKET);
  if (bucket.error) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: `${MAX_BYTES}`,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
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
