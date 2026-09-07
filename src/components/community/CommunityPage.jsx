"use client";

import { ArrowRight, Clock3, Search, Sparkles, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CharacterCard from "@/components/hub/CharacterCard";
import { Button } from "@/components/ui/button";
import { getUserDisplayName } from "@/lib/userDisplay";
import { cn } from "@/lib/utils";
import { pb } from "@/stores/useConfiguratorStore";

const COMMUNITY_SKELETON_KEYS = Array.from(
  { length: 20 },
  (_, index) => `community-skeleton-${index}`,
);

const SORTS = [
  { id: "newest", label: "Newest", icon: Clock3 },
  { id: "name", label: "A-Z", icon: Sparkles },
];

export default function CommunityPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    let cancelled = false;

    pb.collection("CharacterStudioCharacters")
      .getList(1, 100, {
        sort: "-created",
        filter: 'hidden != true && guest != true && thumbnail != ""',
        skipTotal: true,
        expand: "user",
        requestKey: null,
      })
      .then((result) => {
        if (!cancelled) setItems(result.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? items.filter((item) => {
          const author = getUserDisplayName(item.expand?.user, "");
          return `${item.name || ""} ${author}`.toLowerCase().includes(term);
        })
      : items;

    return [...filtered].sort((a, b) => {
      if (sort === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
  }, [items, query, sort]);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-14">
      <section className="grid gap-8 border-b border-white/[0.07] pb-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-tight text-white/60">
            <UsersRound className="h-3.5 w-3.5 text-amber-200" />
            Community characters
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Browse what creators have published.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55">
            Public characters with thumbnails, ready to open, study, remix, or
            use as inspiration for your own GLB-ready character.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <div className="w-full max-w-xl rounded-lg border border-white/10 bg-white/[0.035] p-2">
            <label className="flex items-center gap-2 rounded-md bg-black/20 px-3 py-2.5 text-sm text-white/70">
              <Search className="h-4 w-4 text-white/40" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by character or creator"
                className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/30"
              />
            </label>
          </div>
          <div className="flex w-full max-w-xl items-center justify-between gap-3">
            <span className="text-xs text-white/42">
              {visibleItems.length} of {items.length} shown
            </span>
            <div className="flex rounded-lg border border-white/10 bg-white/[0.035] p-1">
              {SORTS.map((item) => {
                const Icon = item.icon;
                const active = sort === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSort(item.id)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium tracking-tight transition-colors",
                      active
                        ? "bg-white text-zinc-950"
                        : "text-white/55 hover:text-white",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {COMMUNITY_SKELETON_KEYS.map((key) => (
              <div
                key={key}
                className="aspect-square animate-pulse rounded-lg bg-white/[0.04]"
              />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <h2 className="text-lg font-semibold tracking-tight text-white">
              No characters found
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Try a different search or publish the first matching character.
            </p>
            <Button
              asChild
              className="mt-6 h-auto rounded-lg bg-white px-5 py-3 text-sm font-semibold tracking-tight text-zinc-950 hover:bg-white"
            >
              <Link href="/editor">
                Create your character
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visibleItems.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                size="wall"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
