"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminTwilioSettingsForm() {
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [messagingServiceSid, setMessagingServiceSid] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  function saveDemo(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-primary">Twilio credentials</CardTitle>
        <CardDescription>
          Account SID and Auth Token from the Twilio Console. Keep tokens server-side in production;
          this form is for configuration UI review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={saveDemo} className="space-y-4">
          <div>
            <Label htmlFor="tw-account-sid">Account SID</Label>
            <Input
              id="tw-account-sid"
              className="mt-1.5 font-mono text-sm"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="tw-auth-token">Auth token</Label>
            <div className="relative mt-1.5">
              <Input
                id="tw-auth-token"
                type={showToken ? "text" : "password"}
                className="pr-10 font-mono text-sm"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Your auth token"
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowToken((s) => !s)}
                aria-label={showToken ? "Hide auth token" : "Show auth token"}
              >
                {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="tw-msg-service">Messaging Service SID (optional)</Label>
            <Input
              id="tw-msg-service"
              className="mt-1.5 font-mono text-sm"
              value={messagingServiceSid}
              onChange={(e) => setMessagingServiceSid(e.target.value)}
              placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              For A2P / campaign registration flows you may also store a compliance template ID later.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="submit">Save (demo)</Button>
            {saved ? (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved locally (UI only).</span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
