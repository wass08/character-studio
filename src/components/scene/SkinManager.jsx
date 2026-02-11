import { useEffect } from "react";
import { useConfiguratorStore, pb } from "@/stores/useConfiguratorStore";
import { useCombinedTexture } from "@/hooks/useCombinedTexture";

export const SkinManager = () => {
  const skinMaterial = useConfiguratorStore((state) => state.skin);
  const customization = useConfiguratorStore((state) => state.customization);

  // Get raw values
  const rawSkinColor =
    customization["Skin"]?.color || customization["skin"]?.color || "#e7a67a";

  // Get URLs
  const overlayUrls = Object.values(customization)
    .map((item) => {
      const asset = item.asset;
      if (!asset || !asset.url) return null;
      const url = pb.files.getURL(asset, asset.url);
      return url.match(/\.(png|jpg|jpeg|webp)$/i) ? url : null;
    })
    .filter(Boolean);

  // This hook now returns NULL initially, then the TEXTURE when ready.
  // It does NOT suspend.
  const combinedTexture = useCombinedTexture(overlayUrls, rawSkinColor);

  useEffect(() => {
    if (!skinMaterial) return;

    // 1. Always keep the base color updated
    skinMaterial.color.set(rawSkinColor);

    // 2. Assign map only if we have one, or explicitly null it if we don't.
    // NOTE: 'combinedTexture' will hold the OLD texture until the NEW one is ready
    // thanks to the state logic in the new hook.
    if (combinedTexture) {
      skinMaterial.map = combinedTexture;
    } else if (overlayUrls.length === 0) {
      // Only clear the map if we genuinely have no URLs to show
      skinMaterial.map = null;
    }

    skinMaterial.needsUpdate = true;
  }, [combinedTexture, skinMaterial, rawSkinColor, overlayUrls.length]);

  return null;
};
