import { useEffect, useState } from "react";
import type { MeshStandardMaterial } from "three";
import { useCombinedTexture } from "@/hooks/useCombinedTexture";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";

type Asset = {
  r2Url?: string | null;
  url?: string | null;
  collectionId?: string;
  id?: string;
};

type CustomizationEntry = {
  asset?: Asset | null;
  color?: string | null;
  colors?: Record<string, string>;
};

type Customization = Record<string, CustomizationEntry>;

type StoreSlice = {
  skin: MeshStandardMaterial | null;
  customization: Customization;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export const SkinManager = () => {
  const skinMaterial = useConfiguratorStore(
    (state: StoreSlice) => state.skin,
  );
  const customization = useConfiguratorStore(
    (state: StoreSlice) => state.customization,
  );

  const rawSkinColor: string =
    customization.Skin?.color || customization.skin?.color || "#e7a67a";

  const debouncedSkinColor = useDebounce(rawSkinColor, 100);

  const overlayUrls = Object.values(customization)
    .map((item: CustomizationEntry): string | null => {
      const asset = item.asset;
      if (!asset) return null;
      const url =
        asset.r2Url ||
        // pb.files.getURL needs the record + a filename; only call when asset.url is set.
        (asset.url
          ? pb.files.getURL(
              asset as { collectionId?: string; id?: string },
              asset.url,
            )
          : null);
      if (!url) return null;
      return url.match(/\.(png|jpg|jpeg|webp)$/i) ? url : null;
    })
    .filter((u): u is string => Boolean(u));

  const combinedTexture = useCombinedTexture(overlayUrls, debouncedSkinColor);

  useEffect(() => {
    if (combinedTexture && skinMaterial) {
      skinMaterial.color.set(rawSkinColor);
      skinMaterial.map = combinedTexture;
      skinMaterial.needsUpdate = true;

      return () => {
        skinMaterial.map = null;
        skinMaterial.color.set(debouncedSkinColor);
      };
    }
  }, [combinedTexture, skinMaterial, debouncedSkinColor, rawSkinColor]);

  return null;
};
