"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

import { StudentHowToWizard } from "@/components/dashboard/parent/student-howto-wizard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * The student walkthrough, opened in place.
 *
 * Offered wherever a parent is already mid-task — the Students page and the
 * campaign editor — so reading the steps does not cost them their unsaved work.
 */
export function StudentHowToDialog({
  label = "How do I add another student?",
  initialTrack = "existing",
  variant = "outline",
}: {
  label?: string;
  initialTrack?: "existing" | "new-campaign" | "one-campaign" | "remove";
  variant?: "outline" | "ghost" | "secondary";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={variant} size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <HelpCircle className="size-4" aria-hidden />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Adding and removing students</DialogTitle>
          </DialogHeader>
          <StudentHowToWizard initialTrack={initialTrack} />
        </DialogContent>
      </Dialog>
    </>
  );
}
