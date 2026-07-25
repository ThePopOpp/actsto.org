import Link from "next/link";

export function ConsentShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted/30">
      <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:py-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-act-red">Arizona Christian Tuition · ACTSTO.ORG</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold text-primary sm:text-4xl">{title}</h1>
        <p className="mt-3 text-muted-foreground">{subtitle}</p>
        <div className="mt-8">{children}</div>
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/communication-preferences" className="underline underline-offset-2 hover:text-foreground">Communication preferences</Link>
          <Link href="/legal" className="underline underline-offset-2 hover:text-foreground">Privacy &amp; Terms</Link>
          <Link href="/contact" className="underline underline-offset-2 hover:text-foreground">Contact us</Link>
        </div>
      </section>
    </div>
  );
}
