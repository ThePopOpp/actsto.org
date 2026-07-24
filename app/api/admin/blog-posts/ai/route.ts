import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { coerceBlocks, type BlogBlock, type BlogBlockType } from "@/lib/blog/blocks";
import { getOpenAIClient, SHEPARD_MODEL } from "@/lib/shepard/client";

export const maxDuration = 60;

const VALID_TYPES: BlogBlockType[] = [
  "heading",
  "paragraph",
  "image",
  "video",
  "quote",
  "code",
  "button",
  "divider",
  "spacer",
  "columns",
  "columns3",
  "columns4",
];

async function chatJson(system: string, user: string) {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: SHEPARD_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI is not configured (missing OPENAI_API_KEY)." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    topic?: string;
    text?: string;
    instruction?: string;
    content?: string;
    title?: string;
  } | null;
  const action = body?.action;

  try {
    if (action === "generate") {
      const topic = (body?.topic ?? "").trim();
      if (!topic) return NextResponse.json({ error: "A topic is required." }, { status: 400 });
      const data = await chatJson(
        `You write blog posts for ACTSTO.org, an Arizona Christian school tuition scholarship platform (families, donors, tax-credit giving). Return ONLY JSON of the form {"blocks":[...]}. Each block is {"type": <one of: heading, paragraph, quote>, "props": {...}}. heading props: {"level":"h2","content":"..."}. paragraph props: {"content":"..."}. quote props: {"content":"...","author":"..."}. Produce a complete, well-structured article: an h2 or h1 intro heading, several h2 section headings each followed by 1-2 paragraphs, and optionally one quote. Warm, clear, trustworthy tone. 6-12 blocks.`,
        `Topic: ${topic}`,
      );
      const rawBlocks = Array.isArray(data.blocks) ? data.blocks : [];
      const blocks: BlogBlock[] = coerceBlocks(rawBlocks)
        .filter((b) => VALID_TYPES.includes(b.type))
        .map((b, i) => ({
          id: `ai-${i}`,
          type: b.type,
          props: {
            ...(b.type === "heading" ? { level: (b.props?.level as "h1" | "h2" | "h3") ?? "h2" } : {}),
            content: typeof b.props?.content === "string" ? b.props.content : "",
            ...(b.type === "quote" && typeof b.props?.author === "string" ? { author: b.props.author } : {}),
          },
        }));
      return NextResponse.json({ blocks });
    }

    if (action === "rewrite") {
      const text = (body?.text ?? "").trim();
      const instruction = (body?.instruction ?? "Improve clarity and flow.").trim();
      if (!text) return NextResponse.json({ error: "Nothing to rewrite." }, { status: 400 });
      const data = await chatJson(
        `You edit blog copy for ACTSTO.org. Return ONLY JSON {"text":"..."} with the rewritten text. Preserve meaning and any factual claims; do not add markdown headers. Keep it a single passage.`,
        `Instruction: ${instruction}\n\nText:\n${text}`,
      );
      return NextResponse.json({ text: typeof data.text === "string" ? data.text : text });
    }

    if (action === "meta") {
      const content = (body?.content ?? "").trim();
      const title = (body?.title ?? "").trim();
      if (!content && !title) return NextResponse.json({ error: "No content to summarize." }, { status: 400 });
      const data = await chatJson(
        `You write SEO metadata for ACTSTO.org blog posts. Return ONLY JSON {"title":"...","excerpt":"...","seoTitle":"...","seoDescription":"..."}. title: compelling <=70 chars. excerpt: 1-2 sentence summary. seoTitle: <=60 chars. seoDescription: <=155 chars, action-oriented.`,
        `Working title: ${title || "(none)"}\n\nContent:\n${content.slice(0, 4000)}`,
      );
      return NextResponse.json({
        title: typeof data.title === "string" ? data.title : "",
        excerpt: typeof data.excerpt === "string" ? data.excerpt : "",
        seoTitle: typeof data.seoTitle === "string" ? data.seoTitle : "",
        seoDescription: typeof data.seoDescription === "string" ? data.seoDescription : "",
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI request failed." },
      { status: 500 },
    );
  }
}
