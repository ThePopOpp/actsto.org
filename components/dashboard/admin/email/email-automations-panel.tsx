import { Card, CardContent } from "@/components/ui/card";

const EVENTS = [
  { key: "user_registered", label: "User registered", desc: "Welcome email to a new account." },
  { key: "campaign_submitted", label: "Campaign submitted", desc: "Confirmation to the family + review alert." },
  { key: "campaign_approved", label: "Campaign approved", desc: "Go-live notice to the campaign owner." },
  { key: "donation_paid", label: "Donation paid", desc: "Thank-you + confirmation to the donor." },
  { key: "tax_receipt_generated", label: "Tax receipt generated", desc: "Receipt delivery to the donor." },
];

export function EmailAutomationsPanel() {
  return (
    <div className="space-y-4">
      <Card className="border-border/80">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-heading text-base font-semibold text-primary">Email Automations</p>
          <p className="mt-1">
            Automations connect an event to a template so the right email fires automatically. Transactional sends
            (receipts, confirmations) always respect each recipient&apos;s consent in Communication Preferences.
          </p>
          <p className="mt-2 text-xs">
            Event-to-template mapping UI is the next step in this build — the events below are the recommended triggers.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        {EVENTS.map((e) => (
          <div key={e.key} className="rounded-lg border border-border/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{e.label}</p>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{e.key}</code>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{e.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
