import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

/**
 * How many connections this process may hold.
 *
 * The connection string points at Supavisor in session mode, which allots a
 * fixed number of server connections (15 on this project) shared by every
 * client: each running container, each `next build`, and any maintenance
 * script. A single process claiming 10 of those leaves almost nothing for the
 * rest, and a build alone was enough to exhaust the pool.
 *
 * Override with `DATABASE_POOL_MAX` when the pool size changes, or when moving
 * the runtime to transaction mode (port 6543), which multiplexes and does not
 * have this constraint.
 */
function poolMax(): number {
  const configured = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "", 10);
  if (Number.isFinite(configured) && configured > 0) return configured;
  // A production build runs while the previous container is still serving
  // traffic, and both draw on the same pooler. Next spawns several build
  // workers, so each one stays small and leaves slots for live requests.
  if (process.env.NEXT_PHASE === "phase-production-build") return 2;
  return process.env.NODE_ENV === "production" ? 5 : 3;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Supabase connection string to .env (see .env.example).",
    );
  }

  // Reuse one pool in dev to avoid exhausting connections on hot reload.
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: poolMax(),
      // Fail fast when the database is unreachable. Without this a connection
      // attempt waits indefinitely, which turns a temporary pooler outage into
      // a container start or a build that hangs rather than erroring.
      connectionTimeoutMillis: 10_000,
      // Do not hold a pooler slot open longer than it is being used.
      idleTimeoutMillis: 30_000,
    });
  // Prevent unhandled 'error' events from crashing the RSC stream when the
  // DB is temporarily unreachable (e.g. pooler not yet provisioned).
  pool.on("error", () => {});
  if (process.env.NODE_ENV !== "production") globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
