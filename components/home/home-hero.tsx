"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

import "./home-hero.css";

type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;

export type HomeHeroCta = {
  subheading?: string | null;
  primaryLabel?: string | null;
  primaryUrl?: string | null;
  secondaryLabel?: string | null;
  secondaryUrl?: string | null;
  showSecondary?: boolean | null;
};

const LABELS: ReadonlyArray<readonly [string, string]> = [
  ["Create Your Campaign", "Tell your story & set a tuition goal"],
  ["Share with Your Community", "Church members, family & friends"],
  ["Receive Donations", "Tax-credit gifts arrive in minutes"],
  ["Make an Impact", "Emma attends school this fall"],
];

const DUR = [4600, 4600, 5200, 5600];

const FRIENDS = [
  { n: "JW", x: -190, y: -95, mod: "red" },
  { n: "KM", x: 195, y: -80, mod: "" },
  { n: "RS", x: -165, y: 85, mod: "gold" },
  { n: "TL", x: 175, y: 110, mod: "" },
  { n: "DB", x: -60, y: -150, mod: "" },
  { n: "MC", x: 95, y: -160, mod: "red" },
] as const;

const GIFTS = [
  { amt: "$787", label: "tax credit", x: -190, y: -95, d: 0.3 },
  { amt: "$1,570", label: "tax credit", x: 195, y: -80, d: 0.9 },
  { amt: "$250", label: "", x: 175, y: 110, d: 1.5 },
  { amt: "$500", label: "", x: -165, y: 85, d: 2.0 },
  { amt: "$100", label: "", x: -60, y: -150, d: 2.5 },
  { amt: "$320", label: "", x: 95, y: -160, d: 3.0 },
] as const;

// Deterministic sparkle burst (no Math.random → no SSR/client hydration drift).
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  const r = 90 + (i % 5) * 26;
  return {
    sx: Math.round(Math.cos(a) * r),
    sy: Math.round(Math.sin(a) * r),
    sd: 0.6 + (i % 7) * 0.12,
  };
});

function money(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")} raised`;
}

export function HomeHero({ cta }: { cta?: HomeHeroCta | null }) {
  const [cur, setCur] = useState(0);
  const [labelIdx, setLabelIdx] = useState(0);
  const [fade, setFade] = useState(false);

  const barRef = useRef<HTMLElement | null>(null);
  const raisedRef = useRef<HTMLElement | null>(null);
  const rprogRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number>(0);
  const reducedRef = useRef(false);

  function animRaised(from: number, to: number, ms: number) {
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      if (raisedRef.current) raisedRef.current.textContent = money(from + (to - from) * e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  // Respect reduced motion: freeze on the final "funded" state, no loop.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reducedRef.current = true;
      // Intentional: jump the animation to its final frame and stop.
      /* eslint-disable react-hooks/set-state-in-effect */
      setCur(3);
      setLabelIdx(3);
      /* eslint-enable react-hooks/set-state-in-effect */
      if (barRef.current) barRef.current.style.width = "100%";
      if (raisedRef.current) raisedRef.current.textContent = "$8,000 raised";
    }
  }, []);

  // Per-step choreography: label crossfade, rail progress, bar + counter, auto-advance.
  useEffect(() => {
    if (reducedRef.current) return;
    const timers: number[] = [];

    // Effect-driven animation loop: fade the rail label out, swap, fade back in.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFade(true);
    timers.push(
      window.setTimeout(() => {
        setLabelIdx(cur);
        setFade(false);
      }, 250),
    );

    const rp = rprogRef.current;
    if (rp) {
      rp.classList.remove("run");
      void rp.offsetHeight; // reflow so the fill animation restarts
      rp.style.setProperty("--dur", `${DUR[cur]}ms`);
      rp.classList.add("run");
    }

    const bar = barRef.current;
    if (cur === 0 && bar) {
      bar.style.transition = "none";
      bar.style.width = "0%";
      void bar.offsetHeight;
      bar.style.transition = "";
      if (raisedRef.current) raisedRef.current.textContent = "$0 raised";
      timers.push(
        window.setTimeout(() => {
          bar.style.width = "6%";
          animRaised(0, 480, 800);
        }, 1200),
      );
    }
    if (cur === 2 && bar) {
      timers.push(
        window.setTimeout(() => {
          bar.style.width = "82%";
          animRaised(480, 6560, 2400);
        }, 600),
      );
    }
    if (cur === 3 && bar) {
      timers.push(
        window.setTimeout(() => {
          bar.style.width = "100%";
          animRaised(6560, 8000, 900);
        }, 500),
      );
    }

    timers.push(window.setTimeout(() => setCur((c) => (c + 1) % 4), DUR[cur]));

    return () => {
      timers.forEach((t) => clearTimeout(t));
      cancelAnimationFrame(rafRef.current);
    };
  }, [cur]);

  const primaryUrl = cta?.primaryUrl ?? "/register";
  const primaryLabel = cta?.primaryLabel ?? "Get Started";
  const showSecondary = Boolean(cta?.showSecondary && cta?.secondaryUrl && cta?.secondaryLabel);
  const subheading =
    cta?.subheading ??
    "Your state tax dollars can fund a child's education instead of the general fund. Through Arizona's tax credit program, you can give and get back.";

  return (
    <section className="acthero" aria-label="Invest in a Christ-centered future">
      <div className="acthero__grid">
        <div className="acthero__col">
          <p className="acthero__eyebrow rise d1">Get started with 4 Simple Steps</p>
          <h1 className="acthero__title rise d2">
            Invest in a <em>Christ&#8209;centered</em> future
          </h1>
          <p className="acthero__sub rise d3">{subheading}</p>
          <div className="acthero__ctas rise d4">
            <Link
              href={primaryUrl}
              className={cn(buttonVariants({ size: "lg" }), "min-w-[160px] px-6")}
            >
              {primaryLabel}
            </Link>
            {showSecondary ? (
              <Link
                href={cta!.secondaryUrl as string}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "min-w-[160px] border-primary bg-background text-primary hover:bg-primary/5",
                )}
              >
                {cta!.secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="stagewrap">
          <div className={`stage step-${cur + 1}`}>
            <div className="orbit">
              {FRIENDS.map((f, i) => {
                const ang = Math.atan2(f.y, f.x);
                const len = Math.hypot(f.x, f.y) - 30;
                return (
                  <span
                    key={`spoke-${i}`}
                    className="spoke"
                    style={{
                      width: len,
                      transform: `rotate(${ang}rad)`,
                      transitionDelay: `${0.15 + i * 0.08}s`,
                    }}
                  />
                );
              })}
              {FRIENDS.map((f, i) => (
                <span
                  key={`friend-${i}`}
                  className={cn("friend", f.mod && `friend--${f.mod}`)}
                  style={
                    {
                      "--fx": `${f.x}px`,
                      "--fy": `${f.y}px`,
                      transitionDelay: `${0.2 + i * 0.1}s`,
                    } as CSSVars
                  }
                >
                  {f.n}
                </span>
              ))}
              {GIFTS.map((g, i) => (
                <span
                  key={`gift-${i}`}
                  className="gift"
                  style={
                    {
                      "--fx": `calc(${g.x}px - 50%)`,
                      "--fy": `calc(${g.y}px - 50%)`,
                      "--gd": `${g.d}s`,
                    } as CSSVars
                  }
                >
                  <span className="amt">{g.amt}</span>
                  {g.label ? ` ${g.label}` : ""}
                </span>
              ))}
              {SPARKS.map((s, i) => (
                <span
                  key={`spark-${i}`}
                  className="spark"
                  style={
                    {
                      "--sx": `${s.sx}px`,
                      "--sy": `${s.sy}px`,
                      "--sd": `${s.sd}s`,
                    } as CSSVars
                  }
                />
              ))}
            </div>

            <div className="ccard">
              <span className="funded-badge">100% Funded</span>
              <div className="ccard__photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="ccard__img" src="/hero/emma-and-mom.svg" alt="Emma and her mom" />
              </div>
              <h3>Emma&apos;s 3rd Grade Tuition</h3>
              <p className="school">Valley Christian Schools · Chandler, AZ</p>
              <div className="barrow">
                <div className="bar">
                  <i ref={barRef} />
                </div>
                <div className="bar__meta">
                  <b ref={raisedRef}>$0 raised</b>
                  <span>$8,000 goal</span>
                </div>
              </div>
            </div>

            <div className="linkchip">
              <span className="dot-gold" />
              actsto.org/campaigns/emma
            </div>

            <div className="impact">
              <span className="impact__check">✓</span>
              <p>
                <b>Emma starts school this fall.</b> Donors receive an impact update — and the cycle
                of generosity continues.
              </p>
            </div>
          </div>

          <div className="rail">
            <div className="dots">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  type="button"
                  className={cn("dot", cur === i && "on")}
                  onClick={() => setCur(i)}
                  aria-label={`Step ${i + 1}: ${LABELS[i][0]}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className={cn("rlabel", fade && "fade")}>
              <b className="t">{LABELS[labelIdx][0]}</b>
              <span className="s">{LABELS[labelIdx][1]}</span>
            </div>
            <div className="rprog">
              <i ref={rprogRef} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
