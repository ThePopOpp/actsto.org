"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { CampaignCard } from "@/components/campaign-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MOCK_CAMPAIGNS,
  campaignStats,
  filterCampaigns,
  filterCampaignsBySchoolType,
  parseCampaignFilterParam,
  parseSchoolTypeParam,
  type BrowseSchoolTypeLabel,
  type CampaignFilter,
} from "@/lib/campaigns";
import { cn } from "@/lib/utils";

const FILTERS: { id: CampaignFilter; label: string }[] = [
  { id: "all", label: "All campaigns" },
  { id: "ending-soon", label: "Ending soon" },
  { id: "new", label: "Newly added" },
  { id: "almost-funded", label: "Almost funded" },
  { id: "fully-funded", label: "Fully funded" },
];

function useSyncedSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const replaceParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === "") {
          p.delete(k);
        } else {
          p.set(k, v);
        }
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return { replaceParams, searchParams };
}

export function CampaignsPageClient() {
  const { replaceParams, searchParams } = useSyncedSearchParams();

  const [filter, setFilter] = useState<CampaignFilter>(() =>
    parseCampaignFilterParam(searchParams.get("filter"))
  );
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [schoolType, setSchoolType] = useState<BrowseSchoolTypeLabel | null>(() =>
    parseSchoolTypeParam(searchParams.get("schoolType"))
  );

  useEffect(() => {
    setFilter(parseCampaignFilterParam(searchParams.get("filter")));
  }, [searchParams]);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setSchoolType(parseSchoolTypeParam(searchParams.get("schoolType")));
  }, [searchParams]);

  const list = useMemo(() => {
    const byFilter = filterCampaigns(MOCK_CAMPAIGNS, filter);
    const bySchool = filterCampaignsBySchoolType(byFilter, schoolType);
    if (!q.trim()) return bySchool;
    const s = q.toLowerCase();
    return bySchool.filter(
      (c) =>
        c.title.toLowerCase().includes(s) ||
        c.tagline.toLowerCase().includes(s) ||
        c.excerpt.toLowerCase().includes(s) ||
        c.school.name.toLowerCase().includes(s)
    );
  }, [filter, q, schoolType]);

  const stats = campaignStats(MOCK_CAMPAIGNS);

  function setFilterAndUrl(next: CampaignFilter) {
    setFilter(next);
    replaceParams({
      filter: next === "all" ? null : next,
    });
  }

  function clearSchoolType() {
    setSchoolType(null);
    replaceParams({ schoolType: null });
  }

  return (
    <>
      <section className="bg-primary px-4 py-12 text-primary-foreground sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-act-red uppercase">
              Active campaigns
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold sm:text-4xl">
              Support a student today
            </h1>
          </div>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3 sm:text-right">
            <div>
              <p className="text-primary-foreground/70">Active campaigns</p>
              <p className="text-lg font-semibold tabular-nums">{stats.active}</p>
            </div>
            <div>
              <p className="text-primary-foreground/70">Raised this year</p>
              <p className="text-lg font-semibold tabular-nums">
                ${Math.round(stats.raisedThisYear / 1000)}K
              </p>
            </div>
            <div>
              <p className="text-primary-foreground/70">Total donors</p>
              <p className="text-lg font-semibold tabular-nums">
                {stats.totalDonors.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {schoolType ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">School type:</span>
            <span className="font-medium text-foreground">{schoolType}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-muted-foreground"
              onClick={() => clearSchoolType()}
            >
              <X className="size-3.5" aria-hidden />
              Clear
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={filter === f.id ? "default" : "secondary"}
                className={cn(
                  filter !== f.id && "bg-muted text-foreground hover:bg-muted/80"
                )}
                onClick={() => setFilterAndUrl(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => {
                const v = e.target.value;
                setQ(v);
                replaceParams({ q: v.trim() ? v : null });
              }}
              className="pl-9"
              aria-label="Search campaigns"
            />
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Showing {list.length} campaign{list.length === 1 ? "" : "s"}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-3">
          {list.map((c) => (
            <CampaignCard key={c.slug} campaign={c} />
          ))}
        </div>

        {list.length === 0 && (
          <p className="mt-12 text-center text-muted-foreground">
            No campaigns match your filters.{" "}
            <Link href="/campaigns" className="font-medium text-primary underline-offset-4 hover:underline">
              View all campaigns
            </Link>
          </p>
        )}

        <nav
          className="mt-12 flex justify-center gap-1 text-sm"
          aria-label="Pagination"
        >
          <Button type="button" variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button type="button" variant="default" size="sm">
            1
          </Button>
          <Button type="button" variant="secondary" size="sm">
            2
          </Button>
          <Button type="button" variant="secondary" size="sm">
            3
          </Button>
          <span className="px-2 py-1 text-muted-foreground">…</span>
          <Button type="button" variant="secondary" size="sm">
            8
          </Button>
          <Button type="button" variant="outline" size="sm">
            Next
          </Button>
        </nav>
      </section>
    </>
  );
}
