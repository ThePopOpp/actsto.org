import type { ReactNode } from "react";

export function LegalPageShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-3xl font-semibold text-primary">{title}</h1>
      {lastUpdated ? (
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
      ) : null}
      {children}
    </article>
  );
}
