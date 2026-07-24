import QRCode from "qrcode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url") || "";
  const size = Math.min(1024, Math.max(96, Number(searchParams.get("size")) || 512));
  const fg = searchParams.get("fg") || "#001138";
  const bg = searchParams.get("bg") || "#ffffff";
  if (!url) return new Response("Missing url", { status: 400 });

  try {
    const png = await QRCode.toBuffer(url, {
      type: "png",
      width: size,
      margin: 1,
      color: { dark: fg, light: bg },
      errorCorrectionLevel: "M",
    });
    return new Response(new Uint8Array(png), {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("QR error", { status: 500 });
  }
}
