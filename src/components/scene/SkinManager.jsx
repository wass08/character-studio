import { useState, useEffect } from "react";
import { useConfiguratorStore, pb } from "@/stores/useConfiguratorStore";
import { useCombinedTexture } from "@/hooks/useCombinedTexture";

function useDebounce(value, delay) {
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
  const skinMaterial = useConfiguratorStore((state) => state.skin);
  const customization = useConfiguratorStore((state) => state.customization);

  const rawSkinColor =
    customization["Skin"]?.color || customization["skin"]?.color || "#e7a67a";

  const debouncedSkinColor = useDebounce(rawSkinColor, 100);

  const overlayUrls = Object.values(customization)
    .map((item) => {
      const asset = item.asset;
      if (!asset || !asset.url) return null;
      const url = pb.files.getURL(asset, asset.url);
      return url.match(/\.(png|jpg|jpeg|webp)$/i) ? url : null;
    })
    .filter(Boolean);

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
  }, [combinedTexture, skinMaterial, debouncedSkinColor]);

  return null;
};
