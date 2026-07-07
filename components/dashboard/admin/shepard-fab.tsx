"use client";

import { useState } from "react";
import Image from "next/image";
import { Keyboard, ListChecks, Mic, X } from "lucide-react";

import { ShepardChatModal, type ShepardEntryMode } from "@/components/dashboard/admin/shepard-chat-modal";
import { SHEPARD_ICON_DARK, SHEPARD_ICON_LIGHT } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ENTRY_OPTIONS: { mode: ShepardEntryMode; label: string; icon: typeof Keyboard }[] = [
  { mode: "type", label: "Type", icon: Keyboard },
  { mode: "voice", label: "Voice", icon: Mic },
  { mode: "templates", label: "Templates", icon: ListChecks },
];

export function ShepardFab() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<ShepardEntryMode>("type");

  function launch(entryMode: ShepardEntryMode) {
    setMode(entryMode);
    setMenuOpen(false);
    setModalOpen(true);
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {menuOpen ? (
        <div className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-popover p-2 shadow-lg ring-1 ring-foreground/10">
          {ENTRY_OPTIONS.map(({ mode: entryMode, label, icon: Icon }) => (
            <button
              key={entryMode}
              type="button"
              onClick={() => launch(entryMode)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Icon className="size-4 text-primary" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? "Close Shepard menu" : "Open Shepard"}
        className={cn(
          "relative flex size-14 items-center justify-center rounded-full shadow-lg ring-1 ring-foreground/10 transition-transform hover:scale-105",
          menuOpen && "bg-primary text-primary-foreground dark:bg-[var(--act-brand-navy-dark-elevated)]"
        )}
      >
        {menuOpen ? (
          <X className="size-6" />
        ) : (
          <>
            <Image src={SHEPARD_ICON_LIGHT} alt="Shepard AI" fill className="rounded-full object-contain dark:hidden" sizes="56px" />
            <Image
              src={SHEPARD_ICON_DARK}
              alt="Shepard AI"
              fill
              className="hidden rounded-full object-contain dark:block"
              sizes="56px"
            />
          </>
        )}
      </button>

      <ShepardChatModal open={modalOpen} onOpenChange={setModalOpen} initialMode={mode} />
    </div>
  );
}
