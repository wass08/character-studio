"use client";

import { useEffect, useState } from "react";
import { pb } from "@/stores/useConfiguratorStore";
import CharacterCard from "./CharacterCard";

/**
 * Admin-curated picks above the wall. Admins flip a `featured` flag on a
 * character record (see /admin/characters) and we render up to 8 here.
 *
 * If no characters are featured yet the row stays hidden so the homepage
 * doesn't look broken.
 */
const FeaturedRow = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    pb.collection("CharacterStudioCharacters")
      .getList(1, 8, {
        sort: "-updated",
        filter: "featured = true",
        skipTotal: true,
        expand: "user",
      })
      .then((r) => !cancelled && setItems(r.items))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-5 pb-10 md:px-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Featured
        </h2>
        <span className="text-xs text-white/45">curated picks</span>
      </div>
      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 md:-mx-8 md:px-8">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-52 shrink-0 rounded-2xl aspect-[3/4] animate-pulse bg-white/[0.04]"
              />
            ))
          : items.map((c) => (
              <div key={c.id} className="w-52 shrink-0">
                <CharacterCard character={c} size="featured" />
              </div>
            ))}
      </div>
    </section>
  );
};

export default FeaturedRow;
