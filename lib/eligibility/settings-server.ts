import "server-only";

import type { Prisma } from "@prisma/client";

import {
  ELIGIBILITY_SETTINGS_KEY,
  normalizeEligibilitySettings,
  type EligibilitySettings,
} from "@/lib/eligibility/settings";
import { prisma } from "@/lib/prisma";

export async function getEligibilitySettings(): Promise<EligibilitySettings> {
  const row = await prisma.siteContentSettings
    .findUnique({ where: { key: ELIGIBILITY_SETTINGS_KEY } })
    .catch(() => null);
  return normalizeEligibilitySettings(row?.payload ?? null);
}

export async function saveEligibilitySettings(settings: EligibilitySettings): Promise<void> {
  const payload = settings as unknown as Prisma.InputJsonObject;
  await prisma.siteContentSettings.upsert({
    where: { key: ELIGIBILITY_SETTINGS_KEY },
    create: { key: ELIGIBILITY_SETTINGS_KEY, payload },
    update: { payload },
  });
}
