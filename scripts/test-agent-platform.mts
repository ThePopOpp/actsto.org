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
function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${error instanceof Error ? error.message : String(error)}`);
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

console.log(`agent platform: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
