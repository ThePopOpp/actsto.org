import { readFile } from "node:fs/promises";
import path from "node:path";

// IDs that `ant apply` recorded in claude-lock.json, looked up by the agent's
// slug and role. An ID typed on the AI Agents page always wins. No database
// here, so it's unit-testable.

const ENV_FOR_ROLE: Record<string, string> = { researcher: "act-research", qualifier: "act-research" };

export type LockFile = { resources?: Record<string, { id?: string }> };

export async function readLock(file = path.join(process.cwd(), "claude-lock.json")): Promise<LockFile> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as LockFile;
  } catch {
    return {};
  }
}

export type ResolvedIds = { agentId?: string; environmentId?: string; vaultId?: string; memoryStoreId?: string };

export async function resolveManagedIds(
  agent: { slug: string; role: string; managedAgentId: string | null; environmentId: string | null; vaultId: string | null; memoryStoreId: string | null },
  lockFile?: string,
): Promise<ResolvedIds> {
  const lock = (await readLock(lockFile)).resources ?? {};
  const id = (key: string) => lock[key]?.id ?? lock[key.replace(/^\.\//, "")]?.id;
  const env = ENV_FOR_ROLE[agent.role] ?? "act-workers";
  return {
    agentId: agent.managedAgentId ?? id(`./agents/${agent.slug}/agent.md`),
    environmentId: agent.environmentId ?? id(`./environments/${env}.yaml`),
    vaultId: agent.vaultId ?? id(`./agents/${agent.slug}/vault.yaml`),
    memoryStoreId: agent.memoryStoreId ?? id(`./agents/${agent.slug}/memory_store-playbook.yaml`),
  };
}
