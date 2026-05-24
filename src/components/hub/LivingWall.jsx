"use client";

import { useEffect, useState } from "react";
import { pb } from "@/stores/useConfiguratorStore";
import CharacterCard from "./CharacterCard";

/**
 * The signature wall on the homepage: the most recent 50 characters.
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
    <section className="mx-auto w-full max-w-7xl px-5 pb-20 md:px-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Latest characters
        </h2>
        <span className="text-xs text-white/45">{items.length}</span>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-2xl bg-white/[0.04]"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm text-white/55">
          No characters yet. Be the first — hit{" "}
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
