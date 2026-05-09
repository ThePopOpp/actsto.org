"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseDateValue(value: string) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toDateValue(date: Date | undefined) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date",
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const selected = parseDateValue(value);

  return (
    <Popover>
      <PopoverTrigger
        id={id}
        className={cn(
          "mt-1.5 inline-flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-xs transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <span>{selected ? format(selected, "MMM d, yyyy") : placeholder}</span>
        <CalendarIcon className="size-4 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(toDateValue(date))}
          captionLayout="dropdown"
          buttonVariant="ghost"
        />
        {selected ? (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center text-muted-foreground"
              onClick={() => onChange("")}
            >
              Clear date
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
