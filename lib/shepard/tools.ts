import "server-only";

import { createBlogPost, listAllBlogPosts, updateBlogPost } from "@/lib/admin/blog-posts";
import { inviteUser, isInviteRole, parseAccountStatus } from "@/lib/admin/invite-user";
import { createInvoice, listInvoices, markInvoicePaid } from "@/lib/admin/invoices";
import { AUTOMATION_EVENTS, automationEventDef } from "@/lib/automations/events";
import { prisma } from "@/lib/prisma";
import { sendSmtpEmail } from "@/lib/email/smtp";
import { MAX_BULK_SMS_RECIPIENTS, sendAdminSms } from "@/lib/sms/send-admin-sms";
import { parsePhoneList } from "@/lib/sms/twilio";

export type ShepardToolContext = { adminEmail: string };

export type ShepardToolDefinition = {
  name: string;
  description: string;
  mutating: boolean;
  /** JSON Schema for OpenAI function-calling `parameters`. */
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, ctx: ShepardToolContext) => Promise<unknown>;
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

const readOnlyTools: ShepardToolDefinition[] = [
  {
    name: "lookupUser",
    description: "Look up a user/profile by email address, including their roles and donor/parent profile.",
    mutating: false,
    parameters: {
      type: "object",
      properties: { email: { type: "string", description: "Email address to look up" } },
      required: ["email"],
    },
    execute: async (args) => {
      const email = str(args.email).trim().toLowerCase();
      const profile = await prisma.profile.findFirst({
        where: { email },
        include: {
          userRoles: true,
          businessDonorProfile: true,
          individualDonorProfile: true,
          parentGuardianProfile: true,
        },
      });
      if (!profile) return { found: false };
      return {
        found: true,
        id: profile.id,
        email: profile.email,
        name: profile.fullName ?? profile.displayName,
        isSuperAdmin: profile.isSuperAdmin,
        status: profile.status,
        roles: profile.userRoles.map((r) => r.role),
        isBusinessDonor: Boolean(profile.businessDonorProfile),
        isIndividualDonor: Boolean(profile.individualDonorProfile),
        isParentGuardian: Boolean(profile.parentGuardianProfile),
      };
    },
  },
  {
    name: "listInvoices",
    description: "List invoices billed to business donors, with status and totals.",
    mutating: false,
    parameters: { type: "object", properties: {} },
    execute: async () => {
      const invoices = await listInvoices();
      return invoices.slice(0, 25).map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        total: Number(inv.total),
        dueDate: inv.dueDate,
        campaignTitle: inv.campaignTitle,
      }));
    },
  },
  {
    name: "listBlogPosts",
    description: "List blog posts and their publish status.",
    mutating: false,
    parameters: { type: "object", properties: {} },
    execute: async () => {
      const posts = await listAllBlogPosts();
      return posts.slice(0, 25).map((p) => ({ id: p.id, title: p.title, slug: p.slug, status: p.status }));
    },
  },
  {
    name: "listPendingApprovals",
    description: "List items pending Super Admin review (campaigns, schools, scholarship apps, comments, reviews).",
    mutating: false,
    parameters: { type: "object", properties: {} },
    execute: async () => {
      const rows = await prisma.approvalQueue.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 25,
      });
      return rows.map((r) => ({ id: r.id, entityType: r.entityType, entityId: r.entityId, createdAt: r.createdAt }));
    },
  },
  {
    name: "listNotifications",
    description: "List recent in-app dashboard notifications.",
    mutating: false,
    parameters: { type: "object", properties: {} },
    execute: async () => {
      const rows = await prisma.dashboardNotification.findMany({ orderBy: { createdAt: "desc" }, take: 25 });
      return rows.map((r) => ({ id: r.id, title: r.title, message: r.message, createdAt: r.createdAt }));
    },
  },
  {
    name: "listAutomationOptions",
    description:
      "List everything needed to build an automation: available trigger events (with their merge fields), email templates, SMS templates, campaigns, and social platforms. ALWAYS call this before createAutomation so you use real template IDs and a valid trigger.",
    mutating: false,
    parameters: { type: "object", properties: {} },
    execute: async () => {
      const [emails, sms, campaigns] = await Promise.all([
        prisma.emailTemplate.findMany({ where: { status: { not: "archived" } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
        prisma.smsTemplate.findMany({ where: { active: true }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
        prisma.campaign.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" }, take: 100 }),
      ]);
      return {
        triggerEvents: AUTOMATION_EVENTS.map((e) => ({ id: e.id, label: e.label, description: e.description, mergeFields: e.fields })),
        emailTemplates: emails,
        smsTemplates: sms,
        campaigns,
        socialPlatforms: ["facebook", "linkedin"],
        conditionRoles: ["parent", "student", "donor_individual", "donor_business"],
      };
    },
  },
];

const mutatingTools: ShepardToolDefinition[] = [
  {
    name: "inviteUser",
    description: "Create a new user account and send them credentials to sign in.",
    mutating: true,
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        role: { type: "string", enum: ["super_admin", "parent", "student", "donor_individual", "donor_business"] },
        status: { type: "string", enum: ["active", "invited", "suspended"] },
        password: { type: "string", description: "At least 8 characters." },
      },
      required: ["name", "email", "role", "status", "password"],
    },
    execute: async (args) => {
      const role = str(args.role);
      const status = str(args.status);
      if (!isInviteRole(role)) throw new Error(`Invalid role "${role}".`);
      const accountStatus = parseAccountStatus(status);
      if (!accountStatus) throw new Error(`Invalid status "${status}".`);
      return inviteUser({
        name: str(args.name, "Unnamed user"),
        email: str(args.email),
        role,
        status: accountStatus,
        password: str(args.password),
      });
    },
  },
  {
    name: "sendEmail",
    description: "Send a one-off email from hello@actsto.org.",
    mutating: true,
    parameters: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        text: { type: "string" },
      },
      required: ["to", "subject", "text"],
    },
    execute: async (args) => {
      const info = await sendSmtpEmail({ to: str(args.to), subject: str(args.subject), text: str(args.text) });
      return { messageId: info.messageId };
    },
  },
  {
    name: "sendSms",
    description: "Send an SMS to one recipient or a comma/newline-separated list of recipients (max 50).",
    mutating: true,
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Phone number, or multiple separated by commas/newlines." },
        message: { type: "string" },
      },
      required: ["to", "message"],
    },
    execute: async (args) => {
      const recipients = parsePhoneList(str(args.to));
      const message = str(args.message).trim().slice(0, 1600);
      if (!recipients.length) throw new Error("At least one valid recipient phone number is required.");
      if (!message) throw new Error("Message is required.");
      if (recipients.length > MAX_BULK_SMS_RECIPIENTS) {
        throw new Error(`SMS is limited to ${MAX_BULK_SMS_RECIPIENTS} recipients per send.`);
      }
      const results = await sendAdminSms(recipients, message);
      return { sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
    },
  },
  {
    name: "createInvoice",
    description: "Create an invoice billing a business donor against one of their pledges.",
    mutating: true,
    parameters: {
      type: "object",
      properties: {
        pledgeId: { type: "string" },
        dueDate: { type: "string", description: "YYYY-MM-DD" },
        lineItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
            },
            required: ["description", "quantity", "unitPrice"],
          },
        },
        taxRatePercent: { type: "number" },
        notes: { type: "string" },
      },
      required: ["pledgeId", "dueDate", "lineItems"],
    },
    execute: async (args, ctx) => {
      const lineItems = Array.isArray(args.lineItems)
        ? (args.lineItems as Record<string, unknown>[]).map((l) => ({
            description: str(l.description),
            quantity: num(l.quantity, 1),
            unitPrice: num(l.unitPrice, 0),
          }))
        : [];
      return createInvoice({
        pledgeId: str(args.pledgeId),
        dueDate: str(args.dueDate),
        lineItems,
        taxRatePercent: num(args.taxRatePercent, 0),
        notes: str(args.notes),
        createdByEmail: ctx.adminEmail,
      });
    },
  },
  {
    name: "markInvoicePaid",
    description: "Mark an invoice as paid.",
    mutating: true,
    parameters: {
      type: "object",
      properties: { invoiceId: { type: "string" } },
      required: ["invoiceId"],
    },
    execute: async (args) => markInvoicePaid(str(args.invoiceId)),
  },
  {
    name: "createBlogPost",
    description: "Create a new blog post (draft by default; set status to 'publish' to publish immediately).",
    mutating: true,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        slug: { type: "string", description: "Optional — auto-generated from title if omitted." },
        status: { type: "string", enum: ["draft", "publish", "future", "private", "pending"] },
        excerpt: { type: "string" },
        content: { type: "string" },
        categories: { type: "string", description: "Comma-separated." },
        tags: { type: "string", description: "Comma-separated." },
        authorName: { type: "string" },
      },
      required: ["title"],
    },
    execute: async (args, ctx) =>
      createBlogPost(
        {
          title: str(args.title),
          slug: str(args.slug),
          status: str(args.status, "draft"),
          excerpt: str(args.excerpt),
          content: str(args.content),
          categories: str(args.categories),
          tags: str(args.tags),
          authorName: str(args.authorName),
        },
        ctx.adminEmail
      ),
  },
  {
    name: "createAutomation",
    description:
      "Create a trigger-based automation sequence. When an event fires, each step sends after its delay. Steps can be email, SMS, or a social draft post. Call listAutomationOptions first to get valid trigger IDs and template IDs. Use merge fields like {{first_name}} in captions. Created enabled unless told otherwise.",
    mutating: true,
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        triggerEvent: { type: "string", description: "One of the trigger event IDs from listAutomationOptions (e.g. donation_paid)." },
        enabled: { type: "boolean" },
        conditions: {
          type: "object",
          description: "Optional filters.",
          properties: {
            roles: { type: "array", items: { type: "string", enum: ["parent", "student", "donor_individual", "donor_business"] } },
            minAmount: { type: "number", description: "Only fire when the donation amount is at least this (dollars)." },
            campaignId: { type: "string" },
          },
        },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              channel: { type: "string", enum: ["email", "sms", "social"] },
              emailTemplateId: { type: "string", description: "Required when channel is email." },
              smsTemplateId: { type: "string", description: "Required when channel is sms." },
              socialPlatform: { type: "string", enum: ["facebook", "linkedin"], description: "For social steps." },
              socialCaption: { type: "string", description: "For social steps — the draft post caption (merge fields allowed)." },
              subjectOverride: { type: "string", description: "Optional email subject override." },
              delayMinutes: { type: "number", description: "Minutes after the event before this step runs. 0 = immediately." },
            },
            required: ["channel"],
          },
        },
      },
      required: ["name", "triggerEvent", "steps"],
    },
    execute: async (args, ctx) => {
      const name = str(args.name).trim().slice(0, 160);
      const triggerEvent = str(args.triggerEvent).trim();
      if (!name) throw new Error("Automation name is required.");
      if (!automationEventDef(triggerEvent)) {
        throw new Error(`Unknown trigger "${triggerEvent}". Call listAutomationOptions for valid trigger IDs.`);
      }
      const rawSteps = Array.isArray(args.steps) ? (args.steps as Record<string, unknown>[]) : [];
      if (!rawSteps.length) throw new Error("At least one step is required.");
      const steps = rawSteps.map((s, i) => {
        const channel = ["email", "sms", "social"].includes(str(s.channel)) ? str(s.channel) : "email";
        return {
          sortOrder: i,
          channel,
          emailTemplateId: channel === "email" ? str(s.emailTemplateId) || null : null,
          smsTemplateId: channel === "sms" ? str(s.smsTemplateId) || null : null,
          socialPlatform: channel === "social" ? str(s.socialPlatform) || "facebook" : null,
          socialCaption: channel === "social" ? str(s.socialCaption).slice(0, 2000) || null : null,
          subjectOverride: channel === "email" ? str(s.subjectOverride) || null : null,
          delayMinutes: Math.max(0, num(s.delayMinutes, 0)),
        };
      });
      const rawConditions = (args.conditions ?? {}) as Record<string, unknown>;
      const conditions: Record<string, unknown> = {};
      if (Array.isArray(rawConditions.roles) && rawConditions.roles.length) conditions.roles = rawConditions.roles.map(String);
      if (typeof rawConditions.minAmount === "number" && rawConditions.minAmount > 0) conditions.minAmount = rawConditions.minAmount;
      if (str(rawConditions.campaignId)) conditions.campaignId = str(rawConditions.campaignId);
      const created = await prisma.automation.create({
        data: {
          name,
          description: str(args.description).slice(0, 500) || null,
          triggerEvent,
          enabled: args.enabled !== false,
          conditions: conditions as object,
          createdBy: ctx.adminEmail,
          steps: { create: steps },
        },
        select: { id: true, name: true },
      });
      return { id: created.id, name: created.name, steps: steps.length };
    },
  },
  {
    name: "publishBlogPost",
    description: "Publish an existing blog post immediately.",
    mutating: true,
    parameters: {
      type: "object",
      properties: { postId: { type: "string" } },
      required: ["postId"],
    },
    execute: async (args) => {
      const postId = str(args.postId);
      const current = await prisma.blogPost.findUnique({ where: { id: postId } });
      if (!current) throw new Error("Blog post not found.");
      return updateBlogPost(postId, {
        title: current.title,
        slug: current.slug,
        status: "publish",
        excerpt: current.excerpt ?? undefined,
        content: current.content ?? undefined,
        featuredImageUrl: current.featuredImageUrl ?? undefined,
        featuredImageAlt: current.featuredImageAlt ?? undefined,
        categories: current.categories ?? undefined,
        tags: current.tags ?? undefined,
        authorName: current.authorName ?? undefined,
        seoTitle: current.seoTitle ?? undefined,
        seoDescription: current.seoDescription ?? undefined,
        canonicalUrl: current.canonicalUrl ?? undefined,
        focusKeyword: current.focusKeyword ?? undefined,
      });
    },
  },
];

export const SHEPARD_TOOLS: ShepardToolDefinition[] = [...readOnlyTools, ...mutatingTools];

export function getShepardTool(name: string): ShepardToolDefinition | undefined {
  return SHEPARD_TOOLS.find((t) => t.name === name);
}
