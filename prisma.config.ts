import "dotenv/config";
import { lookup } from "node:dns/promises";
import { defineConfig } from "prisma/config";

/**
 * Pick the connection the Prisma CLI uses for migrations.
 *
 * `DIRECT_URL` is preferred when it works: a direct session is the cleanest
 * place to run migrations. But Supabase retired the IPv4 direct endpoint, so
 * `db.<ref>.supabase.co` now publishes an AAAA record only and does not resolve
 * from an IPv4-only network — which describes most container runtimes.
 *
 * That matters because the container start command is
 * `prisma migrate deploy && next start`. A `DIRECT_URL` that cannot be reached
 * does not just fail the migration, it stops the server from ever starting, so
 * the deploy hangs with a healthy database and an idle machine.
 *
 * The pooler in session mode handles migrations correctly, so when the direct
 * host does not resolve we fall back to `DATABASE_URL` rather than stalling.
 */
async function resolvesToAnAddress(url: string): Promise<boolean> {
  try {
    const host = new URL(url).hostname;
    await lookup(host);
    return true;
  } catch {
    return false;
  }
}

async function migrationUrl(): Promise<string | undefined> {
  const direct = process.env["DIRECT_URL"];
  const pooled = process.env["DATABASE_URL"];

  if (direct && (await resolvesToAnAddress(direct))) return direct;
  if (direct && pooled) {
    console.warn(
      "[prisma] DIRECT_URL does not resolve; running migrations over DATABASE_URL instead.",
    );
  }
  return pooled ?? direct;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: await migrationUrl(),
  },
});
