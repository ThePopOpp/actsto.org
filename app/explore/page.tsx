import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-3xl font-semibold text-primary">Explore</h1>
      <p className="mt-3 text-muted-foreground">
        Landing content for Explore — link to{" "}
        <Link href="/campaigns" className="text-primary underline-offset-2 hover:underline">
          active campaigns
        </Link>
        .
      </p>
    </div>
  );
}
