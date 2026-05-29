"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { analyzeMorphs } from "./blendshapeRefs";

const stateOf = (found, total) => {
  if (total === 0) return "none";
  if (found === total) return "full";
  if (found > 0) return "partial";
  return "none";
};

const StatusBadge = ({ found, total }) => {
  const state = stateOf(found, total);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        state === "full" && "text-emerald-400",
        state === "partial" && "text-amber-400",
        state === "none" && "text-muted-foreground/70",
      )}
    >
      <span className="tabular-nums">
        {found} / {total}
      </span>
      {state === "none" ? (
        <X className="h-3.5 w-3.5" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}
    </span>
  );
};

const CategoryRow = ({ category, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  if (category.total === 0) return null;
  return (
    <div className="border-t border-border first:border-t-0">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className="flex h-auto w-full items-center justify-between gap-2 rounded-none px-3 py-2 text-sm font-normal transition-colors hover:bg-accent/30 hover:text-foreground"
      >
        <span className="inline-flex items-center gap-2">
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
          />
          <span className="font-medium">{category.label}</span>
        </span>
        <StatusBadge found={category.found} total={category.total} />
      </Button>
      {open && (
        <ul className="grid grid-cols-1 gap-x-3 gap-y-1 px-3 pb-2.5 text-xs sm:grid-cols-2">
          {category.items.map((it) => (
            <li key={it.label} className="flex items-center gap-1.5">
              {it.present ? (
                <Check className="h-3 w-3 shrink-0 text-emerald-400" />
              ) : (
                <X className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              )}
              <span
                className={cn(
                  "truncate",
                  it.present ? "text-foreground/90" : "text-muted-foreground/70",
                )}
                title={it.label}
              >
                {it.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const BlendshapeSection = ({ morphs = [] }) => {
  const stats = useMemo(() => analyzeMorphs(morphs), [morphs]);

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card/50">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-sm font-medium">
        <span>Blendshapes</span>
        <span className="text-xs text-muted-foreground">
          {stats.total} key{stats.total === 1 ? "" : "s"}
        </span>
      </div>
      <CategoryRow category={stats.arkit} />
      <CategoryRow category={stats.visemes} />
      <CategoryRow category={stats.faceControls} />
      <CategoryRow category={stats.bodyControls} />
      {stats.other.total > 0 && <CategoryRow category={stats.other} />}
    </div>
  );
};

export default BlendshapeSection;
