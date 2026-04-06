import type { Metadata } from "next";

export const metadata: Metadata = { title: "Resources" };

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-3xl font-semibold text-primary">Resources / blog</h1>
      <p className="mt-3 text-muted-foreground">Content placeholder — wire MDX or headless CMS later.</p>
    </div>
  );
}
