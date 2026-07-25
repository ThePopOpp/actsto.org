import { Card, CardContent } from "@/components/ui/card";

const STEPS: { title: string; body: string }[] = [
  { title: "1. Create a template", body: "Use the Templates tab (or build a blog post and “Convert to email”). Add {{first_name}}, {{email}}, and other merge fields where the message should personalize itself." },
  { title: "2. Preview & test safely", body: "Preview the rendered email and send yourself a test before any broader send." },
  { title: "3. Connect automations", body: "Map events (registration, campaign approved, donation paid, tax receipt) to templates so they fire automatically." },
  { title: "4. Send to a recipient or audience", body: "Use Send Email for a one-off, or deploy a template to a segment from the Templates tab." },
  { title: "5. Sync & review the inbox", body: "The Inbox tab pulls inbound replies and website form submissions over IMAP. Reply in context." },
  { title: "6. Read the history", body: "Every send is logged with provider and status under History — your audit trail." },
];

export function EmailWizard() {
  return (
    <Card className="border-border/80">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-heading text-base font-semibold text-primary">Email wizard</p>
          <p className="text-sm text-muted-foreground">The operating map for the email system — start at the top if you&apos;re new.</p>
        </div>
        <div className="space-y-2">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-lg border border-border/70 p-3">
              <p className="text-sm font-semibold text-foreground">{s.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
