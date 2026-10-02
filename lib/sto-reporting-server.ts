import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeStoReporting, STO_REPORTING_KEY, type StoReportingPayload } from "@/lib/sto-reporting";

export async function getStoReporting(): Promise<StoReportingPayload> {
  const row = await prisma.siteContentSettings.findUnique({ where: { key: STO_REPORTING_KEY } }).catch(() => null);
  return normalizeStoReporting(row?.payload ?? null);
}

export async function saveStoReporting(payload: StoReportingPayload): Promise<void> {
  await prisma.siteContentSettings.upsert({
    where: { key: STO_REPORTING_KEY },
    create: { key: STO_REPORTING_KEY, payload },
    update: { payload },
  });
}
