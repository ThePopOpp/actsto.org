/**
 * Unit tests for the agent platform's pure pieces.
 *
 * Run with: npm run test:agents
 *
 * Pinned here: every agent email carries the AI disclosure and a working,
 * signed unsubscribe link (and RFC 8058 headers); an unsubscribe link can't be
 * edited to unsubscribe someone else; agents only send as their own mailbox
 * when it's on the verified domain; PKCE and the OAuth consent token check out;
 * agent tokens have the prefix the MCP endpoint routes on.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";

process.env.AUTH_SECRET ||= "test-secret-for-agent-platform-unit-tests";

const { composeAgentEmail, senderFor } = await import("@/lib/agents/compose");
const { unsubscribeUrl, verifyUnsubscribe } = await import("@/lib/consent/unsubscribe-link");
const { verifyPkce } = await import("@/lib/mcp/crypto");
const { consentToken, verifyConsentToken } = await import("@/lib/mcp/consent-token");
const { newAgentToken, cleanScopes, STARTER_AGENTS } = await import("@/lib/agents/roster");

let passed = 0;
let failed = 0;
const pending: Promise<void>[] = [];
function test(name: string, fn: () => void | Promise<void>) {
  const fail = (error: unknown) => {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${error instanceof Error ? error.message : String(error)}`);
  };
  try {
    const out = fn();
    if (out instanceof Promise) pending.push(out.then(() => void (passed += 1), fail));
    else passed += 1;
  } catch (error) {
    fail(error);
  }
}

const ORIGIN = "https://actsto.org";

test("agent email: AI disclosure, postal line and unsubscribe in text and html", () => {
  const m = composeAgentEmail({ bodyText: "Hello Pastor Smith,\n\nThank you for your time.", personaName: "Grace", toEmail: "Pastor@Example.org", origin: ORIGIN });
  assert.match(m.text, /written by Grace, an AI assistant for Arizona Christian Tuition/);
  assert.match(m.text, /Unsubscribe: https:\/\/actsto\.org\/api\/public\/consent\/email\/unsubscribe\?e=pastor%40example\.org&s=[0-9a-f]{32}/);
  assert.ok(m.html.includes("AI assistant"));
  assert.ok(m.html.includes("Unsubscribe</a>"));
  assert.equal(m.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.equal(m.headers["List-Unsubscribe"], `<${m.unsubscribeUrl}>`);
});

test("agent email: body is escaped, paragraphs kept", () => {
  const m = composeAgentEmail({ bodyText: "Hi <b>there</b>\n\nSecond & last", personaName: null, toEmail: "a@b.co", origin: ORIGIN });
  assert.ok(m.html.includes("Hi &lt;b&gt;there&lt;/b&gt;"));
  assert.ok(m.html.includes("Second &amp; last"));
  assert.equal((m.html.match(/<p style="margin:0 0 14px">/g) ?? []).length, 2);
  assert.match(m.text, /written by an AI assistant for Arizona Christian Tuition/);
});

test("unsubscribe link: verifies for its address only, case-insensitive", () => {
  const url = new URL(unsubscribeUrl(ORIGIN, "Donor@Example.com"));
  const e = url.searchParams.get("e")!;
  const s = url.searchParams.get("s")!;
  assert.equal(e, "donor@example.com");
  assert.ok(verifyUnsubscribe(e, s));
  assert.ok(!verifyUnsubscribe("someone.else@example.com", s));
  assert.ok(!verifyUnsubscribe(e, s.slice(0, -1) + (s.endsWith("0") ? "1" : "0")));
  assert.ok(!verifyUnsubscribe(e, ""));
});

test("sender: own mailbox only on the verified domain", () => {
  assert.deepEqual(senderFor("grace@actsto.org", "Grace", "hello@actsto.org"), {
    from: { name: "Grace (AI assistant) · ACTSTO", email: "grace@actsto.org" },
    replyTo: "grace@actsto.org",
  });
  assert.deepEqual(senderFor("grace@gmail.com", "Grace", "hello@actsto.org"), { replyTo: "grace@gmail.com" });
  assert.deepEqual(senderFor(null, "Grace", "hello@actsto.org"), {});
});

test("PKCE S256", () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const challenge = createHash("sha256").update(verifier).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert.equal(challenge, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  assert.ok(verifyPkce(verifier, challenge));
  assert.ok(!verifyPkce(verifier + "x", challenge));
});

test("consent token: bound to the admin and the request", () => {
  const r = { response_type: "code", client_id: "c1", redirect_uri: "https://claude.ai/cb", code_challenge: "x", code_challenge_method: "S256", state: "s", scope: "act", resource: "" };
  const t = consentToken("admin@actsto.org", r);
  assert.ok(verifyConsentToken(t, "admin@actsto.org", r));
  assert.ok(!verifyConsentToken(t, "other@actsto.org", r));
  assert.ok(!verifyConsentToken(t, "admin@actsto.org", { ...r, redirect_uri: "https://evil.example/cb" }));
  const old = consentToken("admin@actsto.org", r, Date.now() - 16 * 60_000);
  assert.ok(!verifyConsentToken(old, "admin@actsto.org", r));
});

test("agent tokens: prefixed, long, unique", () => {
  const a = newAgentToken();
  const b = newAgentToken();
  assert.match(a, /^actagent_[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, b);
});

test("scopes: unknown values dropped, duplicates removed", () => {
  assert.deepEqual(cleanScopes(["read", "leads", "admin", "read", 7]), ["read", "leads"]);
  assert.deepEqual(cleanScopes("read"), []);
});

test("starter agents: none can send, each has read", () => {
  for (const a of STARTER_AGENTS) {
    assert.ok(a.scopes.includes("read"), a.slug);
    assert.match(a.slug, /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/);
  }
  assert.equal(new Set(STARTER_AGENTS.map((a) => a.slug)).size, STARTER_AGENTS.length);
});

// ── Phase 3/4: Paperclip webhook, lock-file lookup, agent definitions ──────
const { parseWake, verifyWebhook } = await import("@/lib/agents/paperclip");
const { resolveManagedIds } = await import("@/lib/agents/lock");
const { readFileSync, writeFileSync, mkdtempSync, readdirSync } = await import("node:fs");
const { tmpdir } = await import("node:os");
const path = await import("node:path");
const yaml = await import("js-yaml");

const SECRET = "x".repeat(40);
process.env.PAPERCLIP_WEBHOOK_SECRET = SECRET;
const req = (auth?: string) => new Request("https://actsto.org/api/agents/paperclip", { method: "POST", headers: auth ? { authorization: auth } : {} });

test("paperclip webhook: only the exact shared secret passes", () => {
  assert.ok(verifyWebhook(req(`Bearer ${SECRET}`)));
  assert.ok(!verifyWebhook(req(`Bearer ${SECRET}x`)));
  assert.ok(!verifyWebhook(req("Bearer short")));
  assert.ok(!verifyWebhook(req()));
  process.env.PAPERCLIP_WEBHOOK_SECRET = "too-short";
  assert.ok(!verifyWebhook(req("Bearer too-short")), "a short configured secret is refused outright");
  process.env.PAPERCLIP_WEBHOOK_SECRET = SECRET;
});

test("paperclip wake: parses the documented body, rejects incomplete ones", () => {
  assert.deepEqual(parseWake({ runId: "run-123", agentId: "agent-123", context: { taskId: "ACT-7", wakeReason: "scheduled", commentId: null }, customField: 1 }), {
    agentId: "agent-123", runId: "run-123", taskId: "ACT-7", wakeReason: "scheduled", commentId: null,
  });
  assert.equal(parseWake({ agentId: "a" }), null);
  assert.equal(parseWake(null), null);
  assert.equal(parseWake({ agentId: "a", runId: "r" })?.taskId, null, "heartbeat without a task");
});

test("lock file: IDs by slug and role; typed IDs win; missing file is empty", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "actlock-"));
  const file = path.join(dir, "claude-lock.json");
  writeFileSync(file, JSON.stringify({ resources: {
    "./agents/ava-research/agent.md": { id: "agent_ava" },
    "./agents/ava-research/vault.yaml": { id: "vlt_ava" },
    "./agents/ava-research/memory_store-playbook.yaml": { id: "memstore_ava" },
    "./environments/act-research.yaml": { id: "env_research" },
    "./environments/act-workers.yaml": { id: "env_workers" },
  } }));
  const base = { managedAgentId: null, environmentId: null, vaultId: null, memoryStoreId: null };
  assert.deepEqual(await resolveManagedIds({ slug: "ava-research", role: "researcher", ...base }, file), {
    agentId: "agent_ava", environmentId: "env_research", vaultId: "vlt_ava", memoryStoreId: "memstore_ava",
  });
  assert.equal((await resolveManagedIds({ slug: "grace-outreach", role: "outreach", ...base }, file)).environmentId, "env_workers");
  assert.equal((await resolveManagedIds({ slug: "ava-research", role: "researcher", ...base, managedAgentId: "agent_typed" }, file)).agentId, "agent_typed");
  assert.deepEqual(await resolveManagedIds({ slug: "ava-research", role: "researcher", ...base }, path.join(dir, "missing.json")), {
    agentId: undefined, environmentId: undefined, vaultId: undefined, memoryStoreId: undefined,
  });
});

test("agent definitions: ACT MCP only, no bash, social networks never reachable", () => {
  const banned = ["linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "tiktok.com"];
  const slugs = readdirSync("agents");
  assert.deepEqual(slugs.sort(), STARTER_AGENTS.map((a) => a.slug).sort(), "one folder per starter agent");
  for (const slug of slugs) {
    const fm = yaml.load(readFileSync(`agents/${slug}/agent.md`, "utf8").split(/^---$/m)[1]) as {
      name: string; model: string; mcp_servers: { url: string }[]; tools: { type: string; default_config?: { enabled?: boolean }; configs?: { name: string; enabled?: boolean; allowed_domains?: string[] }[] }[];
    };
    assert.equal(fm.name, slug);
    assert.equal(fm.model, "claude-opus-5-5");
    assert.deepEqual(fm.mcp_servers.map((m) => m.url), ["https://actsto.org/api/mcp"]);
    const toolset = fm.tools.find((t) => t.type === "agent_toolset_20260401")!;
    assert.equal(toolset.default_config?.enabled, false, `${slug}: built-in tools off by default`);
    assert.ok(!toolset.configs?.some((c) => c.name === "bash" && c.enabled), `${slug}: no bash`);
    for (const c of toolset.configs ?? []) {
      if (c.enabled && (c.name === "web_search" || c.name === "web_fetch")) {
        assert.ok(c.allowed_domains?.length, `${slug}: web tools need an allow-list`);
        for (const d of c.allowed_domains!) assert.ok(!banned.some((b) => d === b || d.endsWith(`.${b}`)), `${slug}: ${d}`);
      }
    }
    const vault = yaml.load(readFileSync(`agents/${slug}/vault.yaml`, "utf8")) as { type: string };
    assert.equal(vault.type, "vault");
  }
  for (const env of ["act-research", "act-workers"]) {
    const e = yaml.load(readFileSync(`environments/${env}.yaml`, "utf8")) as { config: { networking: { type: string; allow_mcp_servers: boolean; allowed_hosts?: string[] } } };
    assert.equal(e.config.networking.type, "limited");
    assert.equal(e.config.networking.allow_mcp_servers, true);
    for (const h of e.config.networking.allowed_hosts ?? []) assert.ok(!banned.some((b) => h.replace(/^\*\./, "") === b), `${env}: ${h}`);
  }
});

await Promise.all(pending);
console.log(`agent platform: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
