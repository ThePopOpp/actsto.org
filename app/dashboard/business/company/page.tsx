 "use client";

import { useRef, useState } from "react";
import { Building2, Upload } from "lucide-react";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function BusinessCompanyPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  function onLogoChange(file?: File) {
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
  }

  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Company information"
        description="Primary business profile used on receipts, pledge records, and compliance exports."
      />
      <Card className="border-border/80">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Company logo</Label>
            <div className="mt-2 flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 p-4">
              <div className="flex size-14 items-center justify-center overflow-hidden rounded-md border border-border bg-primary/5">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- blob: preview URLs
                  <img src={logoPreview} alt="Company logo preview" className="size-full object-cover" />
                ) : (
                  <Building2 className="size-5 text-primary" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onLogoChange(e.target.files?.[0])}
                />
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4" />
                  Upload logo
                </Button>
                <p className="text-xs text-muted-foreground">PNG/JPG up to 5MB (demo upload preview only)</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="company-name">Legal company name</Label>
            <Input id="company-name" className="mt-1.5" defaultValue="Faithful Giving Foundation" />
          </div>
          <div>
            <Label htmlFor="company-ein">EIN / Tax ID</Label>
            <Input id="company-ein" className="mt-1.5" defaultValue="XX-XXX6789" />
          </div>
          <div>
            <Label htmlFor="company-phone">Main phone</Label>
            <Input id="company-phone" className="mt-1.5" defaultValue="+1 (602) 421-8301" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="company-address">Business address</Label>
            <Input id="company-address" className="mt-1.5" defaultValue="2200 E Camelback Rd, Phoenix, AZ 85016" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="company-notes">Internal notes</Label>
            <Textarea
              id="company-notes"
              className="mt-1.5 min-h-[120px]"
              defaultValue="Finance contact: ap@faithfulgiving.org. Donation compliance review each quarter."
            />
          </div>
          <div className="md:col-span-2">
            <Button>Save company profile</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
