"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatUsPhone } from "@/lib/utils";
import { DONOR_FILING_STATUSES } from "@/lib/donors/filing-status";
import { MediaField } from "@/components/ui/media-field";

type ProfileResponse = {
  profile?: {
    name?: string | null;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    relationship?: string | null;
    bio?: string | null;
    timezone?: string | null;
    taxCredit?: { applies: boolean; azResident: boolean | null; filingStatus: string };
  };
  error?: string;
};

export function UserProfileEditor({
  role,
  defaultName,
  defaultEmail,
  defaultPhone = "",
  defaultAddress = "",
  defaultCity = "",
  defaultState = "AZ",
  defaultZip = "",
}: {
  /** Drives role-specific fields; "parent" adds the relationship question. */
  role?: string;
  defaultName: string;
  defaultEmail: string;
  defaultPhone?: string;
  defaultAddress?: string;
  defaultCity?: string;
  defaultState?: string;
  defaultZip?: string;
}) {
  const showRelationship = role === "parent";
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState(defaultName);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(defaultPhone);
  const [address, setAddress] = useState(defaultAddress);
  const [city, setCity] = useState(defaultCity);
  const [state, setState] = useState(defaultState);
  const [zip, setZip] = useState(defaultZip);
  const [timezone, setTimezone] = useState("America/Phoenix");
  const [relationship, setRelationship] = useState("");
  const [bio, setBio] = useState("");
  // Individual Donor setup: Arizona residency and filing status.
  const [taxApplies, setTaxApplies] = useState(false);
  const [azResident, setAzResident] = useState<boolean | null>(null);
  const [filingStatus, setFilingStatus] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setStatus("loading");
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) {
          if (mounted) setStatus("idle");
          return;
        }
        const data = (await res.json()) as ProfileResponse;
        if (!mounted || !data.profile) return;

        setName(data.profile.name || defaultName);
        setFirstName(data.profile.firstName || "");
        setMiddleName(data.profile.middleName || "");
        setLastName(data.profile.lastName || "");
        setPhone(data.profile.phone || defaultPhone);
        setAddress(data.profile.address || defaultAddress);
        setCity(data.profile.city || defaultCity);
        setState(data.profile.state || defaultState);
        setZip(data.profile.zip || defaultZip);
        setAvatarUrl(data.profile.avatarUrl || null);
        setBio(data.profile.bio || "");
        setRelationship(data.profile.relationship || "");
        setTimezone(data.profile.timezone || "America/Phoenix");
        if (data.profile.taxCredit?.applies) {
          setTaxApplies(true);
          setAzResident(data.profile.taxCredit.azResident);
          setFilingStatus(data.profile.taxCredit.filingStatus || "");
        }
        setStatus("idle");
      } catch {
        if (mounted) setStatus("idle");
      }
    }

    void loadProfile();
    return () => {
      mounted = false;
    };
  }, [defaultAddress, defaultCity, defaultName, defaultPhone, defaultState, defaultZip]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          firstName,
          middleName,
          lastName,
          phone,
          address,
          city,
          state,
          zip,
          avatarUrl,
          bio,
          timezone,
          ...(showRelationship ? { relationship } : {}),
          ...(taxApplies ? { azResident, filingStatus } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as ProfileResponse;
      if (!res.ok) {
        throw new Error(data.error || "Profile could not be saved.");
      }
      setStatus("saved");
      setMessage("Profile saved.");
      window.setTimeout(() => {
        setStatus((current) => (current === "saved" ? "idle" : current));
        setMessage((current) => (current === "Profile saved." ? "" : current));
      }, 2200);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Profile could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your name and contact details, used on receipts and to fill in donation forms, and how you
          appear on campaigns.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Photo</CardTitle>
            <CardDescription>
              JPG or PNG up to 10 MB. Square images (400px or larger) look best on campaign cards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MediaField
              id="dp-photo"
              folder="people"
              shape="round"
              fallbackName={[firstName, lastName].filter(Boolean).join(" ") || name}
              value={avatarUrl}
              onChange={(url) => setAvatarUrl(url || null)}
            />
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
              <div>
                <Label htmlFor="dp-first">First name</Label>
                <Input
                  id="dp-first"
                  className="mt-1.5"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dp-middle">Middle name (optional)</Label>
                <Input
                  id="dp-middle"
                  className="mt-1.5"
                  autoComplete="additional-name"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dp-last">Last name</Label>
                <Input
                  id="dp-last"
                  className="mt-1.5"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="dp-name">Public display name (optional)</Label>
              <Input
                id="dp-name"
                className="mt-1.5"
                placeholder={[firstName, lastName].filter(Boolean).join(" ")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Shown on campaign pages and messages. Leave blank to use your first and last name.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="dp-email">Email</Label>
              <Input id="dp-email" type="email" className="mt-1.5 bg-muted/50" value={defaultEmail} disabled readOnly />
              <p className="mt-1 text-xs text-muted-foreground">
                This is the email you sign in with. To change it, contact us.
              </p>
            </div>
            <div>
              <Label htmlFor="dp-phone">Mobile phone</Label>
              <Input
                id="dp-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(480) 555-0148"
                className="mt-1.5"
                value={formatUsPhone(phone)}
                onChange={(e) => setPhone(formatUsPhone(e.target.value))}
              />
            </div>
            {showRelationship ? (
              <div>
                <Label htmlFor="dp-relationship">Relationship to student</Label>
                <Select value={relationship} onValueChange={(v) => setRelationship(v ?? "")}>
                  <SelectTrigger id="dp-relationship" className="mt-1.5 h-10 w-full">
                    <SelectValue placeholder="Select a relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mother">Mother</SelectItem>
                    <SelectItem value="Father">Father</SelectItem>
                    <SelectItem value="Guardian">Legal guardian</SelectItem>
                    <SelectItem value="Grandparent">Grandparent</SelectItem>
                    <SelectItem value="Other">Other relative or caregiver</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  How you&apos;re related to the students on your account. Required before your parent
                  profile counts as complete.
                </p>
              </div>
            ) : null}
            <div>
              <Label htmlFor="dp-tz">Timezone</Label>
              <Select value={timezone} onValueChange={(v) => setTimezone(v ?? "America/Phoenix")}>
                <SelectTrigger id="dp-tz" className="mt-1.5 h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Phoenix">Arizona (MST, no DST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                  <SelectItem value="America/Denver">Mountain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Address</CardTitle>
            <CardDescription>
              Used for donation receipts, tax-credit records, and account correspondence.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <Label htmlFor="dp-addr">Street address</Label>
              <Input id="dp-addr" className="mt-1.5" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="dp-city">City</Label>
              <Input id="dp-city" className="mt-1.5" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="sm:col-span-1">
              <Label htmlFor="dp-state">State</Label>
              <Input id="dp-state" className="mt-1.5" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="dp-zip">ZIP</Label>
              <Input id="dp-zip" className="mt-1.5" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {taxApplies ? (
          <Card id="tax-credit" className="scroll-mt-24 border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Tax-credit details</CardTitle>
              <CardDescription>
                Needed to finish Individual Donor setup. Your filing status sets which Arizona credit limit the
                donation form shows you.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <fieldset className="space-y-2 sm:col-span-2">
                <legend className="text-sm font-medium">Are you an Arizona resident (or do you file an Arizona return)?</legend>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="dp-az" className="size-4" checked={azResident === true} onChange={() => setAzResident(true)} />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="dp-az" className="size-4" checked={azResident === false} onChange={() => setAzResident(false)} />
                    No
                  </label>
                </div>
                {azResident === false ? (
                  <p className="text-xs text-muted-foreground">
                    The Arizona credit applies to Arizona income tax. You can still give; check with your tax advisor.
                  </p>
                ) : null}
              </fieldset>
              <div>
                <Label htmlFor="dp-filing">Filing status</Label>
                <select
                  id="dp-filing"
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={filingStatus}
                  onChange={(e) => setFilingStatus(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {DONOR_FILING_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Married filing jointly uses the married limit; every other status uses the single limit.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Story</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="sm:col-span-2">
              <Label htmlFor="dp-bio">Short bio (optional)</Label>
              <Textarea
                id="dp-bio"
                className="mt-1.5 min-h-[88px]"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Shown on campaign pages when you choose to feature your story."
              />
            </div>
          </CardContent>
        </Card>

        {message ? (
          <p
            className={
              status === "error"
                ? "text-sm text-destructive"
                : "text-sm text-emerald-600 dark:text-emerald-400"
            }
          >
            {message}
          </p>
        ) : null}
        <Button type="submit" disabled={status === "saving" || status === "loading"}>
          {status === "saving" ? "Saving..." : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
