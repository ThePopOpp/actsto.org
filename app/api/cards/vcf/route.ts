import { loadPublicCardBySlug, recordEvent } from "@/lib/business-cards/data";

function esc(v: string): string {
  return v.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || "";
  const card = await loadPublicCardBySlug(slug).catch(() => null);
  if (!card) return new Response("Card not found", { status: 404 });

  const first = card.firstName || (card.displayName || "").split(" ")[0] || "";
  const last = card.lastName || (card.displayName || "").split(" ").slice(1).join(" ") || "";
  const full = card.displayName || [first, last].filter(Boolean).join(" ");

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(last)};${esc(first)};;;`,
    `FN:${esc(full)}`,
    card.companyName ? `ORG:${esc(card.companyName)}` : "",
    card.jobTitle ? `TITLE:${esc(card.jobTitle)}` : "",
    card.primaryPhone ? `TEL;TYPE=CELL:${esc(card.primaryPhone)}` : "",
    card.primaryEmail ? `EMAIL;TYPE=INTERNET:${esc(card.primaryEmail)}` : "",
    card.websiteUrl ? `URL:${esc(card.websiteUrl)}` : "",
    card.bio ? `NOTE:${esc(card.bio)}` : "",
    "END:VCARD",
  ].filter(Boolean);

  await recordEvent({ cardId: card.id, eventType: "save_contact" }).catch(() => {});

  return new Response(lines.join("\r\n"), {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${slug || "contact"}.vcf"`,
    },
  });
}
