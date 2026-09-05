"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { pb } from "@/stores/useConfiguratorStore";

const WallScene = dynamic(() => import("@/components/lab/WallScene"), {
  ssr: false,
});

const HERO_CHARACTER_LIMIT = 8;
const PUBLIC_CHARACTER_FILTER =
  'hidden != true && guest != true && thumbnail != ""';

const HeroCharacterWall = () => {
  const [items, setItems] = useState([]);
  const [assetsById, setAssetsById] = useState(() => new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const characters = await pb
        .collection("CharacterStudioCharacters")
        .getList(1, HERO_CHARACTER_LIMIT, {
          sort: "@random",
          filter: PUBLIC_CHARACTER_FILTER,
          skipTotal: true,
          expand: "user",
          requestKey: null,
        });

      // Only fetch the asset records these 8 characters actually reference
      // (≤ ~80 ids) — pulling the whole assets collection here was a big
      // chunk of the homepage's load lag.
      const assetIds = new Set();
      for (const character of characters.items) {
        for (const picked of Object.values(character.customization || {})) {
          if (picked?.assetId) assetIds.add(picked.assetId);
        }
      }
      const assets =
        assetIds.size > 0
          ? await pb.collection("CharacterStudioAssets").getFullList({
              filter: [...assetIds].map((id) => `id="${id}"`).join("||"),
              requestKey: null,
            })
          : [];

      if (cancelled) return;
      const map = new Map();
      for (const asset of assets) map.set(asset.id, asset);
      setAssetsById(map);
      setItems(characters.items);
    })()
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

  // The scene sits over an intentional page gradient, so an empty canvas is
  // the cleanest loading state. The old card grid looked like unrelated feed
  // content and flashed before the 3D lineup mounted.
  if (loading) return null;

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/45">
        No public characters yet.
      </div>
    );
  }

  return (
    <WallScene characters={items} assetsById={assetsById} variant="hero" />
  );
};

export default HeroCharacterWall;
