"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, User } from "lucide-react";

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

type ProfileResponse = {
  profile?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  error?: string;
};

export function UserProfileEditor({
  defaultName,
  defaultEmail,
  defaultPhone = "",
  defaultAddress = "",
  defaultCity = "",
  defaultState = "AZ",
  defaultZip = "",
}: {
  defaultName: string;
  defaultEmail: string;
  defaultPhone?: string;
  defaultAddress?: string;
  defaultCity?: string;
  defaultState?: string;
  defaultZip?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [address, setAddress] = useState(defaultAddress);
  const [city, setCity] = useState(defaultCity);
  const [state, setState] = useState(defaultState);
  const [zip, setZip] = useState(defaultZip);
  const [timezone, setTimezone] = useState("America/Phoenix");
  const [bio, setBio] = useState("");
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
        setPhone(data.profile.phone || defaultPhone);
        setAddress(data.profile.address || defaultAddress);
        setCity(data.profile.city || defaultCity);
        setState(data.profile.state || defaultState);
        setZip(data.profile.zip || defaultZip);
        setAvatarUrl(data.profile.avatarUrl || null);
        setPhotoPreview(data.profile.avatarUrl || null);
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

  function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 1_500_000) {
      setStatus("error");
      setMessage("Please choose an image smaller than 1.5 MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      setAvatarUrl(dataUrl);
      setPhotoPreview(dataUrl);
      setStatus("idle");
      setMessage("");
    };
    reader.onerror = () => {
      setStatus("error");
      setMessage("We could not read that image. Please try another file.");
    };
    reader.readAsDataURL(f);
  }

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
          phone,
          address,
          city,
          state,
          zip,
          avatarUrl,
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
          Update how you appear on campaigns and in supporter communications. Email changes may
          require verification when wired to your auth provider.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Photo</CardTitle>
            <CardDescription>
              Square images (400px+) look best on campaign cards. Larger files will be stored
              through media storage once uploads are connected.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- profile previews may be data URLs
                  <img src={photoPreview} alt="" className="size-full object-cover" />
                ) : (
                  <User className="size-12 text-muted-foreground" strokeWidth={1.25} />
                )}
              </div>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute -right-1 -bottom-1 size-9 rounded-full shadow-md"
                onClick={() => fileRef.current?.click()}
                aria-label="Change photo"
              >
                <Camera className="size-4" />
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onPhotoPick}
              />
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Upload photo
              </Button>
              {avatarUrl || photoPreview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    setAvatarUrl(null);
                    setPhotoPreview(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="dp-name">Display name</Label>
              <Input id="dp-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="dp-email">Email</Label>
              <Input id="dp-email" type="email" className="mt-1.5 bg-muted/50" value={defaultEmail} disabled readOnly />
              <p className="mt-1 text-xs text-muted-foreground">
                To change email, use account security (when connected) or contact support.
              </p>
            </div>
            <div>
              <Label htmlFor="dp-phone">Mobile phone</Label>
              <Input id="dp-phone" className="mt-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
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
            <div className="sm:col-span-2">
              <Label htmlFor="dp-addr">Street address</Label>
              <Input id="dp-addr" className="mt-1.5" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dp-city">City</Label>
              <Input id="dp-city" className="mt-1.5" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dp-state">State</Label>
              <Input id="dp-state" className="mt-1.5" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dp-zip">ZIP</Label>
              <Input id="dp-zip" className="mt-1.5" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
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
