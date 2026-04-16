import { prisma } from "@/lib/prisma";

/** Count campaigns per parent email from the persisted admin campaign directory JSON. */
export async function campaignsCountsByEmail(): Promise<Map<string, number>> {
  const dir = await prisma.adminCampaignDirectory.findUnique({ where: { id: "default" } });
  const raw = dir?.rows;
  const rows = Array.isArray(raw) ? raw : [];
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r && typeof r === "object" && "parent" in r) {
      const parent = (r as { parent?: { email?: string } }).parent;
      const em = parent?.email?.trim().toLowerCase();
      if (em) map.set(em, (map.get(em) ?? 0) + 1);
    }
  }
  return map;
}
