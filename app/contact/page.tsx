import type { Metadata } from "next";
import { Calendar, Clock, Mail, Phone } from "lucide-react";
import Link from "next/link";

import { QuickContactForm } from "@/components/contact/quick-contact-form";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GENERAL_EMAIL,
  TEAM_PHONE_DISPLAY,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact us",
};

const team = [
  { name: "Scott Spaulding", role: "Donor support", email: "scott@actsto.org" },
  { name: "Chris Leavitt", role: "Family support", email: "chris@actsto.org" },
  { name: "Jeremy Waters", role: "General support", email: "jeremy@actsto.org" },
];

export default function ContactPage() {
  return (
    <div className="bg-muted/40">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl font-semibold text-primary">
          Contact us
        </h1>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4" />
          Monday – Friday 9:00 am to 5:00 pm
        </p>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Contact us to schedule a consultation — either in-person or over the phone.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <QuickContactForm />

          <div className="space-y-6">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-xl text-primary">
                  General inquiries
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  Reach us at{" "}
                  <Link
                    href={`mailto:${GENERAL_EMAIL}`}
                    className="inline-flex items-center gap-1 font-medium text-act-red hover:underline"
                  >
                    <Mail className="size-4" />
                    {GENERAL_EMAIL}
                  </Link>{" "}
                  and we will get back to you as soon as possible.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-xl text-primary">
                  Support contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {team.map((m) => (
                  <div
                    key={m.email}
                    className="flex flex-col gap-3 border-b border-border pb-6 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-primary">{m.name}</p>
                      <p className="text-sm text-muted-foreground">{m.role}</p>
                      <Link
                        href={`mailto:${m.email}`}
                        className="mt-1 inline-flex items-center gap-1 text-sm text-act-red hover:underline"
                      >
                        <Mail className="size-3.5" />
                        {m.email}
                      </Link>
                      <Link
                        href={`tel:${TEAM_PHONE_DISPLAY.replace(/\D/g, "")}`}
                        className="mt-1 flex items-center gap-1 text-sm text-act-red hover:underline"
                      >
                        <Phone className="size-3.5" />
                        {TEAM_PHONE_DISPLAY}
                      </Link>
                    </div>
                    <Link
                      href="/contact"
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "inline-flex shrink-0 gap-1"
                      )}
                    >
                      <Calendar className="size-4" />
                      Schedule
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
