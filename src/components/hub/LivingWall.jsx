"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { pb } from "@/stores/useConfiguratorStore";
import CharacterCard from "./CharacterCard";

const WALL_SKELETON_KEYS = Array.from(
  { length: 10 },
  (_, index) => `wall-skeleton-${index}`,
);

/**
 * The community wall on the homepage: the most recent 50 public characters.
 * No curation here — featured picks live above in their own row.
 */
const LivingWall = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    pb.collection("CharacterStudioCharacters")
      .getList(1, 50, {
        sort: "-created",
        filter: 'hidden != true && thumbnail != ""',
        skipTotal: true,
        expand: "user",
      })
      .then((r) => {
        if (!cancelled) setItems(r.items);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="community"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-5 py-14 md:px-8 md:py-16"
    >
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Recently shared
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
            Public characters with thumbnails, ordered by what the community has
            published most recently.
          </p>
        </div>
        <Link
          href="/community"
          className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium tracking-tight text-white/55 transition-colors hover:text-white sm:inline-flex"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {WALL_SKELETON_KEYS.map((key) => (
            <div
              key={key}
              className="aspect-square animate-pulse rounded-lg bg-white/[0.04]"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm text-white/55">
          No shared characters yet. Be the first, hit{" "}
          <span className="font-semibold text-white">Create</span>.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((c) => (
            <CharacterCard key={c.id} character={c} size="wall" />
          ))}
        </div>
      )}
    </section>
  );
};

export default LivingWall;
