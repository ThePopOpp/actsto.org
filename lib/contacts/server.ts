import "server-only";

import type { Contact } from "@prisma/client";

import type { ContactDTO } from "@/lib/contacts/constants";

export function toContactDTO(c: Contact, roles?: string[]): ContactDTO {
  return {
    id: c.id,
    userId: c.userId,
    firstName: c.firstName,
    lastName: c.lastName,
    displayName: c.displayName,
    email: c.email,
    phone: c.phone,
    company: c.company,
    jobTitle: c.jobTitle,
    contactType: c.contactType,
    stage: c.stage,
    status: c.status,
    tags: c.tags,
    source: c.source,
    notes: c.notes,
    avatarUrl: c.avatarUrl,
    logoUrl: c.logoUrl,
    city: c.city,
    state: c.state,
    roles: roles ?? undefined,
    lastContactedAt: c.lastContactedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
