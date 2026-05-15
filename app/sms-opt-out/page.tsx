import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, Mail, Phone, RotateCcw, ShieldX } from "lucide-react";

import { buttonVariants } from "@/lib/button-variants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "SMS Opt-Out",
  description: "Unsubscribe from ACTSTO.ORG text messages.",
};

const optOutCards = [
  {
    step: "1",
    title: "Reply STOP",
    text: "Send a text reply with the word STOP to any ACTSTO.ORG message you have received.",
    action: "STOP",
    icon: ShieldX,
  },
  {
    step: "2",
    title: "Call Our Office",
    text: "Speak with an ACTSTO.ORG representative to be removed from our SMS list.",
    action: "(602) 421-8301",
    icon: Phone,
  },
  {
    step: "3",
    title: "Email Us",
    text: "Send an unsubscribe request including your mobile number.",
    action: "hello@actsto.org",
    icon: Mail,
  },
];

const keywords = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT", "REVOKE"];

export default function SmsOptOutPage() {
  return (
    <div className="bg-muted/40">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <Badge variant="secondary" className="bg-act-banner text-act-banner-foreground">
          SMS Communications
        </Badge>
        <h1 className="mt-4 max-w-3xl font-heading text-4xl font-semibold text-primary sm:text-5xl">
          Unsubscribe from ACTSTO.ORG Text Messages
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          You can opt out of SMS communications from ACTSTO.ORG at any time. Choose any method below.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {optOutCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-border/80 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {item.step}
                    </span>
                    <Icon className="size-5 text-act-red" />
                  </div>
                  <h2 className="mt-4 font-heading text-xl font-semibold text-primary">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                  <p className="mt-4 font-semibold text-act-red">{item.action}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <section className="mt-10 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-2xl font-semibold text-primary">What Happens After You Opt Out</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Once you reply STOP to any ACTSTO.ORG SMS message, you will receive one final confirmation text and no further
            messages will be sent to your number. The confirmation looks like this:
          </p>
          <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <p className="font-semibold text-primary">From: ACTSTO.ORG</p>
            <p className="mt-2 text-muted-foreground">
              ACTSTO.ORG: You have been unsubscribed and will receive no further messages. Reply START to resubscribe.
            </p>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Your opt-out is processed immediately. If you ever want to receive SMS again, simply reply START to that
            confirmation message, or opt back in through any ACTSTO.ORG website form.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-2xl font-semibold text-primary">Accepted Opt-Out Keywords</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Any of the following keywords will unsubscribe you. Capitalization does not matter.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <span key={keyword} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-primary">
                {keyword}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <HelpCircle className="mt-1 size-5 shrink-0 text-act-red" />
            <div>
              <h2 className="font-heading text-2xl font-semibold text-primary">Need Help Instead?</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Not trying to unsubscribe? If you have a question about a message you received or need to reach
                ACTSTO.ORG, reply HELP to any SMS, or call our office during business hours.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-act-banner bg-act-banner/60 p-6 text-sm text-act-banner-foreground">
          Opting out of SMS does not opt you out of email or phone communications related to your active ACTSTO.ORG
          account, donation, campaign, or support relationship. To manage those, contact us directly at{" "}
          <a href="mailto:hello@actsto.org" className="font-semibold text-act-red hover:underline">
            hello@actsto.org
          </a>
          .
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="tel:+16024218301" className={cn(buttonVariants(), "gap-2")}>
            <Phone className="size-4" />
            Call (602) 421-8301
          </Link>
          <Link href="/contact" className={buttonVariants({ variant: "outline" })}>
            Contact ACTSTO.ORG
          </Link>
          <Link href="/sms-opt-in" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
            <RotateCcw className="size-4" />
            Opt Back In
          </Link>
        </div>
      </section>
    </div>
  );
}
