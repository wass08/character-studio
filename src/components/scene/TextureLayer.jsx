// src/components/TextureLayer.jsx
import { useEffect } from "react";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useCombinedTexture } from "@/hooks/useCombinedTexture";
import * as THREE from "three";

export const TextureLayer = ({ url }) => {
  const skinMaterial = useConfiguratorStore((state) => state.skin);
  const skinColor = useConfiguratorStore(
    (state) => state.customization.skin?.color,
  );

  const combinedTexture = useCombinedTexture(url, skinColor);

  useEffect(() => {
    if (combinedTexture && skinMaterial) {
      const originalColor = skinMaterial.color.clone();

      skinMaterial.color.set(originalColor);

      skinMaterial.map = combinedTexture;
      skinMaterial.map.needsUpdate = true;
      skinMaterial.needsUpdate = true;

      return () => {
        skinMaterial.map = null;
        skinMaterial.color.copy(originalColor);
        skinMaterial.needsUpdate = true;
      };
    }
  }, [combinedTexture, skinMaterial]);

  return null;
};
