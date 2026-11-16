/* eslint-disable @next/next/no-img-element -- small static SVG wordmark */
import {
  ASK,
  AVERAGE_SCHOLARSHIP,
  CONTACT_URL,
  DISCLAIMER,
  GIVING_PATHS,
  HEADLINE,
  impactRows,
  LETTER,
  NOT_AN_ENDORSEMENT,
  signerContact,
  signerLine,
  SOURCES,
  STATS,
  SUMMARY,
  WHY,
  type Signer,
} from "@/lib/proposals/musk-scholars-fund/content";

const NAVY = "bg-[#091b36]";
const RED_TEXT = "text-[#a62c2d]";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className={`text-sm font-bold uppercase tracking-[0.12em] ${RED_TEXT}`}>{children}</h2>;
}

/**
 * The link-only web version of the proposal. Responsive; same words and
 * numbers as the email, one-pager and deck (lib/proposals/musk-scholars-fund/content.ts).
 */
export function ProposalLanding({ signer, onePagerHref }: { signer: Signer; onePagerHref: string | null }) {
  const callHref = signer.email?.trim()
    ? `mailto:${signer.email.trim()}?subject=${encodeURIComponent("Musk Scholars Fund: intro call")}`
    : CONTACT_URL;
  const who = signerLine(signer);

  return (
    <div className="min-h-screen bg-[#eef3fa] font-sans text-[#11161f]">
      {/* Hero, in the X card's style */}
      <header className={`relative overflow-hidden ${NAVY} text-white`}>
        <svg aria-hidden="true" viewBox="0 0 520 520" className="pointer-events-none absolute -right-24 top-16 h-[520px] w-[520px] opacity-[0.07]">
          <rect x="225" y="20" width="70" height="480" rx="6" fill="#fff" />
          <rect x="80" y="150" width="360" height="70" rx="6" fill="#fff" />
        </svg>
        <div className="relative mx-auto flex max-w-5xl flex-col gap-10 px-4 py-14 sm:px-8 sm:py-20">
          <div className="flex items-center justify-between gap-4">
            <img src="/actsto-logo-dark.svg" alt="Arizona Christian Tuition" className="h-10 w-auto sm:h-12" />
            <span className="rounded-full bg-[#a62c2d] px-3 py-1 text-xs font-semibold sm:text-sm">A proposal for Elon Musk</span>
          </div>
          <div className="flex flex-col gap-5">
            <h1 className="font-heading text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">{HEADLINE}</h1>
            <p className="max-w-3xl text-xl leading-snug text-[#c9d3de] sm:text-2xl">
              Every <strong className="text-white">${AVERAGE_SCHOLARSHIP.toLocaleString("en-US")}</strong> puts one Arizona child in a
              Christ-centered school for a year.
            </p>
            <p className="max-w-3xl text-base text-[#c9d3de]">{SUMMARY}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:px-8 sm:py-16">
        {/* Letter */}
        <section className="rounded-2xl border border-[#e5e5e5] bg-white p-6 text-[17px] leading-relaxed sm:p-10">
          <p>{LETTER.salutation}</p>
          {LETTER.paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className="mt-4">
              {p}
            </p>
          ))}
          <p className="mt-4 font-semibold text-[#091b36]">{LETTER.ask}</p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.value} className="rounded-xl border border-[#d4d4d8] bg-white p-5">
              <p className={`font-heading text-3xl font-semibold ${s.accent ? RED_TEXT : "text-[#091b36]"}`}>{s.value}</p>
              <p className="mt-1 text-sm text-[#525252]">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Why Elon */}
        <section className="space-y-4">
          <SectionLabel>Why Elon</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHY.map((w) => (
              <p key={w.title} className="border-l-4 border-[#a62c2d] bg-white p-4 leading-relaxed">
                <strong className="text-[#091b36]">{w.title}</strong> {w.text}
              </p>
            ))}
          </div>
        </section>

        {/* Impact and giving paths */}
        <section className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <SectionLabel>Impact</SectionLabel>
            <div className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-white">
              <div className="flex justify-between bg-[#f6fbff] px-4 py-2.5 text-sm font-semibold text-[#525252]">
                <span>Gift</span>
                <span>Student-years of tuition</span>
              </div>
              {impactRows().map((r) => (
                <div
                  key={r.gift}
                  className={`flex justify-between border-t border-[#e5e5e5] px-4 py-3 ${r.proposed ? `${NAVY} font-semibold text-white` : ""}`}
                >
                  <span>{r.proposed ? `${r.label} · proposed` : r.label}</span>
                  <span className="tabular-nums">{r.studentYears.toLocaleString("en-US")}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#737373]">At ACT&apos;s ${AVERAGE_SCHOLARSHIP.toLocaleString("en-US")} target average scholarship.</p>
          </div>
          <div className="space-y-4">
            <SectionLabel>Giving paths</SectionLabel>
            {GIVING_PATHS.map((g) => (
              <div key={g.title} className="rounded-xl border border-[#e5e5e5] bg-white p-4">
                <p className="font-heading text-lg font-semibold text-[#091b36]">{g.title}</p>
                <p className="mt-1 leading-relaxed text-[#525252]">{g.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The ask */}
        <section className={`rounded-2xl ${NAVY} p-6 text-white sm:p-10`}>
          <h2 className="font-heading text-2xl font-semibold leading-tight sm:text-3xl">{ASK.title}</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {ASK.steps.map((step, i) => (
              <li key={step} className="border-t-2 border-[#a62c2d] pt-3">
                <span className="font-heading text-2xl text-[#e8a3a4]">{i + 1}</span>
                <p className="mt-1">{step}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={callHref} className="inline-flex h-12 items-center rounded-lg bg-[#a62c2d] px-6 font-semibold text-white hover:bg-[#841118]">
              {ASK.cta}
            </a>
            {onePagerHref ? (
              <a href={onePagerHref} className="inline-flex h-12 items-center rounded-lg border border-white/40 px-6 font-semibold text-white hover:bg-white/10">
                Download the one-pager (PDF)
              </a>
            ) : null}
          </div>
          {who || signer.phone || signer.email ? (
            <p className="mt-6 text-[#c9d3de]">
              {who ? <span className="font-semibold text-white">{who}</span> : null}
              {who ? <br /> : null}
              {signerContact(signer)}
            </p>
          ) : null}
        </section>
      </main>

      <footer className="border-t border-[#e5e5e5] bg-[#f6fbff]">
        <div className="mx-auto max-w-5xl space-y-2 px-4 py-8 text-xs leading-relaxed text-[#737373] sm:px-8">
          <p>Sources: {SOURCES.join("; ")}.</p>
          <p>{DISCLAIMER}</p>
          <p>{NOT_AN_ENDORSEMENT}</p>
          <p>
            Arizona Christian Tuition ·{" "}
            <a href="https://actsto.org" className="underline">
              actsto.org
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
