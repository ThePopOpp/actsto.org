import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { faqItems, type FaqBlock } from "@/lib/faq-items";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about scholarships, tax credits, eligibility, and how Arizona Christian Tuition supports your family.",
};

function FaqAnswer({ blocks }: { blocks: FaqBlock[] }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {blocks.map((b, i) => {
        if (b.type === "p") {
          return <p key={i}>{b.text}</p>;
        }
        if (b.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground/80">
              {b.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        if (b.type === "links") {
          return (
            <ul key={i} className="space-y-2">
              {b.links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <h1 className="font-heading text-4xl font-semibold text-primary">FAQ</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Get answers to the most common questions about scholarships, tax credits, eligibility, and
          how Arizona Christian Tuition can support your family. Our goal is to make the process
          simple, transparent, and easy to navigate so you can focus on providing the best Christian
          education for your child.
        </p>

        <h2 className="mt-12 font-heading text-xl font-semibold text-primary">
          Questions &amp; answers
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Expand a question below to read the answer.
        </p>

        <div className="mt-6 space-y-3">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-foreground/5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-left font-medium text-foreground sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 pr-2">{item.question}</span>
                <ChevronDown
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="border-t border-border/60 px-4 pb-5 sm:px-5">
                <div className="pt-4">
                  <FaqAnswer blocks={item.blocks} />
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
