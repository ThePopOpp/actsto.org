"use client";

import Link from "next/link";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  SMS_CONSENT_DISCLOSURE_VERSION,
  SMS_CONSENT_COPY,
  type SmsConsentCopyKey,
} from "@/lib/sms/consent-copy";
import { cn } from "@/lib/utils";

type SmsConsentCheckboxProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  copyKey: SmsConsentCopyKey;
  inputName?: string;
  className?: string;
};

export function SmsConsentCheckbox({
  id,
  checked,
  onCheckedChange,
  copyKey,
  inputName,
  className,
}: SmsConsentCheckboxProps) {
  return (
    <div className={cn("rounded-lg border border-border/60 bg-muted/10 px-3 py-3", className)}>
      {inputName ? <input type="hidden" name={inputName} value={checked ? "true" : "false"} /> : null}
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          className="mt-1 shrink-0"
        />
        <Label htmlFor={id} className="block min-w-0 flex-1 cursor-pointer text-sm leading-snug font-normal">
          {SMS_CONSENT_COPY[copyKey]} View our{" "}
          <Link href="https://actsto.org/legal/privacy" className="text-act-red underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          ,{" "}
          <Link href="https://actsto.org/legal/terms" className="text-act-red underline-offset-4 hover:underline">
            Terms of Service
          </Link>
          , and{" "}
          <Link href="https://actsto.org/legal/communication-policy" className="text-act-red underline-offset-4 hover:underline">
            Communication Policy
          </Link>
          .
        </Label>
      </div>
      <p className="mt-2 pl-7 text-[11px] leading-snug text-muted-foreground">
        SMS disclosure version: {SMS_CONSENT_DISCLOSURE_VERSION}
      </p>
    </div>
  );
}
