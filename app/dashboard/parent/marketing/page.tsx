import { MarketingHub } from "@/components/dashboard/marketing/marketing-hub";

export default function ParentMarketingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Marketing · ACTSTO.org</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Build postcards and plan social promotion for your student&apos;s campaign. The same tools Super Admin sees,
          scoped for your family&apos;s fundraisers.
        </p>
      </div>
      <MarketingHub variant="parent" />
    </div>
  );
}
