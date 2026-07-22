"use client";

import { useState } from "react";
import { Download, Plus, Share, SquarePlus } from "lucide-react";

import { usePwa } from "@/components/pwa/pwa-provider";
import { buttonVariants, type ButtonVariantProps } from "@/lib/button-variants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type DownloadAppButtonProps = {
  label?: string;
  className?: string;
  variant?: ButtonVariantProps["variant"];
  size?: ButtonVariantProps["size"];
  /** Show the download icon before the label. */
  withIcon?: boolean;
  /** Hide entirely once the app is already installed / running standalone. */
  hideWhenInstalled?: boolean;
  /** Fired after a successful native install or when the instructions open. */
  onDone?: () => void;
};

export function DownloadAppButton({
  label = "Download App",
  className,
  variant = "outline",
  size = "sm",
  withIcon = true,
  hideWhenInstalled = true,
  onDone,
}: DownloadAppButtonProps) {
  const { canInstall, isStandalone, isIOS, promptInstall } = usePwa();
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  if (hideWhenInstalled && isStandalone) return null;

  async function handleClick() {
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === "unavailable") {
        setInstructionsOpen(true);
      } else {
        onDone?.();
      }
      return;
    }
    // No native prompt (iOS Safari, desktop Safari/Firefox): show manual steps.
    setInstructionsOpen(true);
    onDone?.();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(buttonVariants({ variant, size }), className)}
        aria-label={label}
      >
        {withIcon ? <Download className="size-4" aria-hidden /> : null}
        {label}
      </button>

      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-primary">
              Install the ACTSTO app
            </DialogTitle>
            <DialogDescription>
              Add ACTSTO to your home screen for a full-screen app experience and push
              notifications.
            </DialogDescription>
          </DialogHeader>

          {isIOS ? (
            <ol className="space-y-4 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <span className="pt-1">
                  Tap the <Share className="inline size-4 align-text-bottom" aria-label="Share" />{" "}
                  <strong>Share</strong> button in the Safari toolbar.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <span className="pt-1">
                  Scroll down and tap{" "}
                  <SquarePlus className="inline size-4 align-text-bottom" aria-hidden />{" "}
                  <strong>Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </span>
                <span className="pt-1">
                  Tap <strong>Add</strong> — the ACTSTO icon appears on your home screen.
                </span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-4 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <span className="pt-1">
                  Open your browser menu (or the{" "}
                  <Plus className="inline size-4 align-text-bottom" aria-hidden /> install icon in
                  the address bar).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <span className="pt-1">
                  Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </span>
                <span className="pt-1">
                  Confirm — ACTSTO opens in its own window like a native app.
                </span>
              </li>
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
