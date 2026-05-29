"use client";

import { useEffect, useState } from "react";
import HubHeader from "@/components/shell/HubHeader";
import { cn } from "@/lib/utils";
import { pb } from "@/stores/useConfiguratorStore";
import WallScene from "./WallScene";

const WALL_LIMIT = 8;

function WallSkeleton() {
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: WALL_LIMIT }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "aspect-square animate-pulse rounded-2xl bg-white/[0.04]",
          )}
        />
      ))}
    </div>
  );
}

export default function WallView() {
  const [items, setItems] = useState([]);
  // assetsById: Map<assetId, assetRecord>. Characters reference assets by
  // id in their customization map, so we side-load the assets collection
  // once and resolve lookups in WallCharacter.
  const [assetsById, setAssetsById] = useState(() => new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      pb.collection("CharacterStudioCharacters").getList(1, WALL_LIMIT, {
        sort: "@random",
        filter: "hidden != true",
        skipTotal: true,
        expand: "user",
        requestKey: null,
      }),
      pb.collection("CharacterStudioAssets").getFullList({
        batch: 1000,
        requestKey: null,
      }),
    ])
      .then(([characters, assets]) => {
        if (cancelled) return;
        const map = new Map();
        for (const a of assets) map.set(a.id, a);
        setAssetsById(map);
        setItems(characters.items);
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

  const renderedCount = loading ? WALL_LIMIT : items.length;

  return (
    <div className={cn("min-h-screen bg-[#101018] text-white")}>
      <HubHeader />
      <main>
        <section className="flex min-h-[calc(100vh-64px)] items-center justify-center px-5 py-10 md:px-8">
          <div className="w-full max-w-7xl">
            <div className="mb-5">
              <h1 className="text-sm font-medium tracking-tight text-white/65">
                Lab — character wall
              </h1>
              <p className="mt-1 max-w-2xl text-sm tracking-tight text-white/45">
                Prototype. Renders {renderedCount} random non-hidden characters
                from PocketBase in one canvas with their saved customization.
                Skin textures and morphs are not yet wired up (handed to the
                engine rewrite).
              </p>
            </div>

            {loading ? (
              <WallSkeleton />
            ) : items.length < 3 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm text-white/55">
                Need at least 3 characters in the DB to render the wall — go to{" "}
                <span className="font-semibold text-white">/create</span> to
                make some.
              </div>
            ) : (
              <div className="relative h-[min(70vh,640px)] min-h-[420px] w-full overflow-hidden">
                <WallScene characters={items} assetsById={assetsById} />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
