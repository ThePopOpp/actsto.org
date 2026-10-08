"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Upload } from "lucide-react";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsPhone } from "@/lib/utils";

type Company = {
  businessName: string;
  ein: string;
  businessEmail: string;
  businessPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  logoUrl: string;
};

const EMPTY: Company = {
  businessName: "",
  ein: "",
  businessEmail: "",
  businessPhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "AZ",
  zip: "",
  logoUrl: "",
};

const MAX_LOGO_BYTES = 1_500_000;

/**
 * The company's own record, used on receipts and to fill in the corporate
 * donation form. It used to load pre-filled with an invented foundation, EIN
 * and address, and the logo upload was preview-only.
 */
export default function BusinessCompanyPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState<Company>(EMPTY);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/business/company", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ company: Company }>) : null))
      .then((data) => {
        if (!mounted) return;
        if (data?.company) setCompany({ ...EMPTY, ...data.company });
        setStatus("idle");
      })
      .catch(() => mounted && setStatus("idle"));
    return () => {
      mounted = false;
    };
  }, []);

  function set<K extends keyof Company>(key: K, value: Company[K]) {
    setCompany((current) => ({ ...current, [key]: value }));
  }

  function onLogoPick(file?: File) {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setStatus("error");
      setMessage("Please choose an image smaller than 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") set("logoUrl", reader.result);
      setMessage("");
      setStatus("idle");
    };
    reader.onerror = () => {
      setStatus("error");
      setMessage("We couldn't read that image. Please try another file.");
    };
    reader.readAsDataURL(file);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/business/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Company info could not be saved.");
      setStatus("saved");
      setMessage("Company info saved.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Company info could not be saved.");
    }
  }

  const disabled = status === "loading" || status === "saving";

  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Company information"
        description="Your business's legal details. They appear on corporate gift receipts and fill in the corporate donation form."
      />
      <form onSubmit={save}>
        <Card className="border-border/80">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Company logo</Label>
              <div className="mt-2 flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 p-4">
                <div className="flex size-14 items-center justify-center overflow-hidden rounded-md border border-border bg-primary/5">
                  {company.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URLs
                    <img src={company.logoUrl} alt="Company logo" className="size-full object-contain" />
                  ) : (
                    <Building2 className="size-5 text-primary" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => onLogoPick(e.target.files?.[0])}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                      <Upload className="size-4" />
                      {company.logoUrl ? "Replace logo" : "Upload logo"}
                    </Button>
                    {company.logoUrl ? (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => set("logoUrl", "")}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">PNG or JPG up to 1.5 MB. Saved with the rest of this form.</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="company-name">Legal business name</Label>
              <Input id="company-name" className="mt-1.5" value={company.businessName} onChange={(e) => set("businessName", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="company-ein">EIN</Label>
              <Input
                id="company-ein"
                className="mt-1.5"
                inputMode="numeric"
                placeholder="12-3456789"
                value={company.ein}
                onChange={(e) => set("ein", e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">Shown only to you and ACT staff, never publicly.</p>
            </div>
            <div>
              <Label htmlFor="company-phone">Main phone</Label>
              <Input
                id="company-phone"
                type="tel"
                className="mt-1.5"
                value={formatUsPhone(company.businessPhone)}
                onChange={(e) => set("businessPhone", formatUsPhone(e.target.value))}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="company-email">Finance or billing email</Label>
              <Input
                id="company-email"
                type="email"
                className="mt-1.5"
                value={company.businessEmail}
                onChange={(e) => set("businessEmail", e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="company-address">Business address</Label>
              <Input id="company-address" className="mt-1.5" value={company.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="company-address2">Suite or unit (optional)</Label>
              <Input id="company-address2" className="mt-1.5" value={company.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="company-city">City</Label>
              <Input id="company-city" className="mt-1.5" value={company.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company-state">State</Label>
                <Input id="company-state" className="mt-1.5" maxLength={2} value={company.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
              </div>
              <div>
                <Label htmlFor="company-zip">ZIP</Label>
                <Input id="company-zip" className="mt-1.5" inputMode="numeric" value={company.zip} onChange={(e) => set("zip", e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <Button type="submit" disabled={disabled}>
                {status === "saving" ? "Saving…" : "Save company info"}
              </Button>
              {message ? (
                <p role={status === "error" ? "alert" : "status"} className={status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                  {message}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
