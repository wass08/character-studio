import { useEffect } from "react";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useCombinedTexture } from "@/hooks/useCombinedTexture";
import * as THREE from "three";

export const TextureLayer = ({ url }) => {
  const skinMaterial = useConfiguratorStore((state) => state.skin);

  const skinColor = useConfiguratorStore((state) => {
    return state.customization["Skin"]?.color;
  });

  const combinedTexture = useCombinedTexture(url, skinColor);

  useEffect(() => {
    if (combinedTexture && skinMaterial) {
      skinMaterial.color.set("#ffffff");
      skinMaterial.map = combinedTexture;
      skinMaterial.map.needsUpdate = true;
      skinMaterial.needsUpdate = true;

      return () => {
        skinMaterial.map = null;
        skinMaterial.color.set(skinColor);
        skinMaterial.needsUpdate = true;
      };
    }
  }, [combinedTexture, skinMaterial, skinColor]);

  return null;
};
