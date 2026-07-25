import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COLUMNS = ["firstName", "lastName", "email", "phone", "company", "jobTitle", "contactType", "stage", "status", "city", "state", "tags", "source", "notes", "isUser", "createdAt"] as const;

function cell(value: unknown): string {
  const s = value == null ? "" : Array.isArray(value) ? value.join(";") : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const contacts = await prisma.contact.findMany({ orderBy: { createdAt: "desc" }, take: 10000 });
  const rows = contacts.map((c) =>
    COLUMNS.map((col) =>
      col === "isUser" ? cell(Boolean(c.userId)) : col === "createdAt" ? cell(c.createdAt.toISOString()) : cell((c as unknown as Record<string, unknown>)[col]),
    ).join(","),
  );
  const csv = [COLUMNS.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
