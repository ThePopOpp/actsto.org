import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Prisma } from "@prisma/client";

import { defineTool, ToolError, z, type ToolCtx } from "@/lib/mcp/define";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";

// Leads live in `contacts` with a segment. Agents add and enrich them; they
// never touch a contact that belongs to a platform account (userId set)
// beyond reading it.

export const SEGMENTS = ["taxpayer", "business", "school", "family"] as const;
export const LEAD_STAGES = ["new", "researching", "qualified", "contacted", "engaged", "converted", "not_a_fit", "do_not_contact"] as const;

const leadFields = {
  id: true, displayName: true, firstName: true, lastName: true, email: true, phone: true, company: true, jobTitle: true,
  segment: true, stage: true, status: true, tags: true, source: true, sourceUrl: true, leadScore: true, city: true, state: true,
  notes: true, lastContactedAt: true, ownerAgentId: true, userId: true, createdAt: true, updatedAt: true,
} satisfies Prisma.ContactSelect;

type LeadRow = Prisma.ContactGetPayload<{ select: typeof leadFields }>;

/** Agents see a platform user's contact card as "existing account" only, nothing personal. */
function present(row: LeadRow) {
  const { userId, ...rest } = row;
  return { ...rest, hasPlatformAccount: !!userId };
}

const leadInput = z.object({
  displayName: z.string().max(200).optional().describe("Person or organization name as it should appear."),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(40).optional(),
  company: z.string().max(200).optional().describe("Business, school, church or employer."),
  jobTitle: z.string().max(200).optional(),
  segment: z.enum(SEGMENTS).describe("taxpayer = individual AZ taxpayer; business = corporate credit prospect; school = school/church/CPA partner; family = family needing a scholarship."),
  city: z.string().max(100).optional(),
  state: z.string().max(40).optional(),
  sourceUrl: z.string().url().max(1000).describe("Public page where this lead was found. Required so staff can verify it."),
  notes: z.string().max(2000).optional().describe("Why this is a good lead, in one or two sentences."),
  tags: z.array(z.string().max(40)).max(10).optional(),
  leadScore: z.number().int().min(0).max(100).optional(),
});

async function findExisting(lead: z.infer<typeof leadInput>) {
  const email = lead.email?.trim().toLowerCase();
  if (email) {
    const hit = await prisma.contact.findFirst({ where: { emailNormalized: email }, select: leadFields });
    if (hit) return hit;
  }
  const phone = lead.phone ? normalizePhone(lead.phone) : "";
  if (phone) {
    const hit = await prisma.contact.findFirst({ where: { phoneNormalized: phone }, select: leadFields });
    if (hit) return hit;
  }
  const name = (lead.company || lead.displayName || "").trim();
  if (name && lead.city) {
    return prisma.contact.findFirst({
      where: {
        city: { equals: lead.city.trim(), mode: "insensitive" },
        OR: [{ company: { equals: name, mode: "insensitive" } }, { displayName: { equals: name, mode: "insensitive" } }],
      },
      select: leadFields,
    });
  }
  return null;
}

export function registerLeadTools(server: McpServer, ctx: ToolCtx) {
  const who = ctx.caller.via === "agent" ? `agent:${ctx.caller.agentSlug}` : ctx.caller.email;

  defineTool(server, ctx, "leads_search", {
    title: "Search leads",
    description: "Search ACT's leads and contacts by name, email, company or city, filtered by segment and stage. Use before adding a lead to avoid duplicates.",
    kind: "read", scope: "read",
    input: {
      query: z.string().max(200).optional(),
      segment: z.enum(SEGMENTS).optional(),
      stage: z.enum(LEAD_STAGES).optional(),
      mine: z.boolean().optional().describe("Only leads owned by the calling agent."),
      limit: z.number().int().min(1).max(100).optional(),
    },
  }, async ({ query, segment, stage, mine, limit }) => {
    const q = query?.trim();
    const where: Prisma.ContactWhereInput = {
      ...(segment ? { segment } : {}),
      ...(stage ? { stage } : {}),
      ...(mine && ctx.caller.agentId ? { ownerAgentId: ctx.caller.agentId } : {}),
      ...(q ? { OR: ["displayName", "firstName", "lastName", "email", "company", "city"].map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) } : {}),
    };
    const rows = await prisma.contact.findMany({ where, select: leadFields, orderBy: { updatedAt: "desc" }, take: limit ?? 25 });
    return { count: rows.length, leads: rows.map(present) };
  });

  defineTool(server, ctx, "lead_get", {
    title: "Get a lead",
    description: "Full lead record plus the outreach drafts already written for it.",
    kind: "read", scope: "read",
    input: { id: z.string().uuid() },
  }, async ({ id }) => {
    const row = await prisma.contact.findUnique({ where: { id }, select: leadFields });
    if (!row) throw new ToolError("No lead with that id.");
    const drafts = await prisma.outboundDraft.findMany({ where: { contactId: id }, select: { id: true, subject: true, status: true, createdAt: true, sentAt: true }, orderBy: { createdAt: "desc" }, take: 20 });
    return { lead: present(row), drafts };
  });

  defineTool(server, ctx, "leads_upsert", {
    title: "Add or enrich leads",
    description:
      "Add up to 25 leads found from public sources. Each needs a segment and the sourceUrl where it was found. Existing leads (matched by email, phone, or name + city) are enriched: empty fields are filled, tags and notes are appended, nothing is overwritten. Only record information that is publicly published by the person or organization.",
    kind: "write", scope: "leads",
    input: { leads: z.array(leadInput).min(1).max(25) },
  }, async ({ leads }) => {
    const results: { name: string; result: "created" | "enriched" | "existing_account" | "do_not_contact"; id: string }[] = [];
    for (const lead of leads) {
      const email = lead.email?.trim().toLowerCase() || null;
      const phone = lead.phone ? normalizePhone(lead.phone) : null;
      const existing = await findExisting(lead);
      const name =
        existing?.displayName || existing?.company ||
        lead.displayName || lead.company || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || email || "lead";

      if (existing?.userId) { results.push({ name, result: "existing_account", id: existing.id }); continue; }
      if (existing?.stage === "do_not_contact") { results.push({ name, result: "do_not_contact", id: existing.id }); continue; }

      if (existing) {
        const fill = <K extends keyof LeadRow>(k: K, v: LeadRow[K] | undefined | null) => (existing[k] == null || existing[k] === "") && v != null && v !== "" ? { [k]: v } : {};
        const note = lead.notes ? `[${new Date().toISOString().slice(0, 10)} ${who}] ${lead.notes}` : null;
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            ...fill("displayName", lead.displayName), ...fill("firstName", lead.firstName), ...fill("lastName", lead.lastName),
            ...fill("company", lead.company), ...fill("jobTitle", lead.jobTitle), ...fill("city", lead.city), ...fill("state", lead.state),
            ...fill("segment", lead.segment), ...fill("sourceUrl", lead.sourceUrl), ...fill("leadScore", lead.leadScore),
            ...(email && !existing.email ? { email, emailNormalized: email } : {}),
            ...(phone && !existing.phone ? { phone: lead.phone, phoneNormalized: phone } : {}),
            tags: Array.from(new Set([...existing.tags, ...(lead.tags ?? [])])).slice(0, 30),
            ...(note ? { notes: existing.notes ? `${existing.notes}\n${note}` : note } : {}),
          },
        });
        results.push({ name, result: "enriched", id: existing.id });
        continue;
      }

      const created = await prisma.contact.create({
        data: {
          displayName: lead.displayName ?? (lead.company || null), firstName: lead.firstName, lastName: lead.lastName,
          email, emailNormalized: email, phone: lead.phone, phoneNormalized: phone || null,
          company: lead.company, jobTitle: lead.jobTitle, city: lead.city, state: lead.state ?? "AZ",
          contactType: "lead", segment: lead.segment, stage: "new", source: who, sourceUrl: lead.sourceUrl,
          leadScore: lead.leadScore, tags: lead.tags ?? [], notes: lead.notes ? `[${new Date().toISOString().slice(0, 10)} ${who}] ${lead.notes}` : null,
          ownerAgentId: ctx.caller.agentId ?? null, createdBy: who,
        },
        select: { id: true },
      });
      results.push({ name, result: "created", id: created.id });
    }
    return {
      created: results.filter((r) => r.result === "created").length,
      enriched: results.filter((r) => r.result === "enriched").length,
      skipped: results.filter((r) => r.result === "existing_account" || r.result === "do_not_contact").length,
      results,
    };
  });

  defineTool(server, ctx, "lead_update", {
    title: "Update a lead",
    description: "Move a lead to a new stage, set its score, add tags, or append a note. Use stage do_not_contact whenever someone asks not to be contacted.",
    kind: "write", scope: "leads",
    input: {
      id: z.string().uuid(),
      stage: z.enum(LEAD_STAGES).optional(),
      leadScore: z.number().int().min(0).max(100).optional(),
      addTags: z.array(z.string().max(40)).max(10).optional(),
      note: z.string().max(2000).optional(),
    },
  }, async ({ id, stage, leadScore, addTags, note }) => {
    const row = await prisma.contact.findUnique({ where: { id }, select: { id: true, userId: true, stage: true, tags: true, notes: true } });
    if (!row) throw new ToolError("No lead with that id.");
    if (row.userId && ctx.caller.via === "agent") throw new ToolError("This contact has an ACTSTO.ORG account. Agents can't change it; ask staff.");
    if (row.stage === "do_not_contact" && stage && stage !== "do_not_contact" && ctx.caller.via === "agent") {
      throw new ToolError("This lead asked not to be contacted. Only staff can change that.");
    }
    const stamped = note ? `[${new Date().toISOString().slice(0, 10)} ${who}] ${note}` : null;
    await prisma.contact.update({
      where: { id },
      data: {
        ...(stage ? { stage } : {}),
        ...(leadScore != null ? { leadScore } : {}),
        ...(addTags?.length ? { tags: Array.from(new Set([...row.tags, ...addTags])).slice(0, 30) } : {}),
        ...(stamped ? { notes: row.notes ? `${row.notes}\n${stamped}` : stamped } : {}),
      },
    });
    return { ok: true, id };
  });
}
