import type { Metadata } from "next";
import { Bell, CalendarCheck, Megaphone, MessageSquareText, ShieldCheck } from "lucide-react";

import { SmsOptInForm } from "@/components/sms/sms-opt-in-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "SMS Opt-In",
  description: "Opt in to ACTSTO.ORG SMS communications.",
};

const cards = [
  {
    title: "Appointment Reminders",
    text: "Confirmations and reminders for meetings, calls, or scheduled ACTSTO-related appointments.",
    icon: CalendarCheck,
  },
  {
    title: "Campaign Updates",
    text: "ACTSTO.ORG campaign notifications, donor activity reminders, and important updates related to your account or campaign.",
    icon: Megaphone,
  },
  {
    title: "Event Invitations",
    text: "Invitations, reminders, and follow-up messages for ACTSTO.ORG events, campaign activities, and related opportunities.",
    icon: Bell,
  },
];

const facts = [
  ["Message Frequency", "1-4 messages per month"],
  ["Carrier Charges", "Message and data rates may apply."],
  ["Opt-Out Anytime", "Reply STOP to any message."],
  ["Need Help?", "Reply HELP or call (602) 421-8301."],
];

export default function SmsOptInPage() {
  return (
    <div className="bg-muted/40">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <Badge variant="secondary" className="bg-act-banner text-act-banner-foreground">
          SMS Communications
        </Badge>
        <h1 className="mt-4 max-w-3xl font-heading text-4xl font-semibold text-primary sm:text-5xl">
          Stay Connected with ACTSTO.ORG
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Receive campaign reminders, donor updates, account alerts, service notifications, and event invitations directly
          to your phone - only when you ask for them.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-border/80 shadow-sm">
                <CardContent className="p-5">
                  <Icon className="size-6 text-act-red" />
                  <h2 className="mt-4 font-heading text-xl font-semibold text-primary">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_420px]">
          <div className="space-y-8">
            <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="font-heading text-2xl font-semibold text-primary">How SMS Opt-In Works</h2>
              <ol className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <li>Enter your mobile phone number on one of our website forms, such as a contact form, appointment form, campaign form, donation-related form, or event registration form.</li>
                <li>Affirmatively check the SMS consent checkbox. The checkbox is unchecked by default and is never required to use our services.</li>
                <li>Submit the form to confirm your request. Once submitted, you may receive a confirmation text from ACTSTO.ORG.</li>
                <li>You can reply STOP at any time to unsubscribe, or HELP for assistance.</li>
              </ol>
            </section>

            <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <MessageSquareText className="size-5 text-act-red" />
                <h2 className="font-heading text-2xl font-semibold text-primary">Consent Disclosure</h2>
              </div>
              <blockquote className="mt-4 border-l-4 border-primary/30 bg-muted/40 py-3 pl-4 text-sm leading-relaxed text-muted-foreground">
                "By providing your phone number and checking this box, you agree to receive SMS messages from ACTSTO.ORG
                regarding campaign reminders, donor messages, service notifications, account updates, appointment reminders,
                and event reminders. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or
                HELP for assistance. Consent is not a condition of any purchase, donation, service, or participation. See
                our Privacy Policy and Terms of Service."
              </blockquote>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              {facts.map(([title, text]) => (
                <div key={title} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <p className="text-sm font-semibold text-primary">{title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </section>

            <section className="rounded-lg border border-act-action/30 bg-act-action/10 p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 size-5 shrink-0 text-act-action" />
                <div>
                  <h2 className="font-heading text-2xl font-semibold text-primary">Opt In Below</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Complete the short form below to begin receiving SMS communications from ACTSTO.ORG.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <SmsOptInForm />
          </div>
        </div>
      </section>
    </div>
  );
}
