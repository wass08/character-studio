import { useTexture } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCombinedTexture } from "@/hooks/useCombinedTexture";
import { pb } from "@/stores/useConfiguratorStore";
import { type AssetRecord, useCharacter } from "./CharacterContext";
import { EngineErrorBoundary } from "./EngineErrorBoundary";

const isImageUrl = (url: string) => /\.(png|jpg|jpeg|webp)$/i.test(url);

const resolveAssetUrl = (asset: AssetRecord): string | null =>
  asset.r2Url ||
  // pb.files.getURL needs the record + a filename; only call when asset.url is set.
  (asset.url ? pb.files.getURL(asset, asset.url) : null);

// Suspends until every requested overlay texture is decoded, then signals
// ready. Renders nothing — it only warms drei's texture cache so the visible
// composite can advance without the live skin flashing to a flat colour.
const SkinTextureGate = ({
  urls,
  onReady,
}: {
  urls: string[];
  onReady: () => void;
}) => {
  useTexture(urls);
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
};

export const SkinManager = () => {
  const { skin: skinMaterial, customization, setAssetLoading } = useCharacter();

  const rawSkinColor: string =
    customization.Skin?.color || customization.skin?.color || "#e7a67a";

  // Makeup overlays are PNG/JPG textures composited onto the skin map (not
  // meshes). Track the requested url per category so we can both keep the
  // current composite until the new one decodes and spin the right thumbnail.
  const requestedByCategory = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    Object.entries(customization).forEach(([categoryName, item]) => {
      const asset = item?.asset;
      if (!asset) return;
      const url = resolveAssetUrl(asset);
      if (url && isImageUrl(url)) map[categoryName] = url;
    });
    return map;
  }, [customization]);

  const requestedUrls = useMemo(
    () => Object.values(requestedByCategory),
    [requestedByCategory],
  );
  const requestedKey = useMemo(
    () => [...requestedUrls].sort().join("|"),
    [requestedUrls],
  );

  // The overlay set currently baked into the live skin map. Advances only
  // once SkinTextureGate has the new textures decoded.
  const [committed, setCommitted] = useState<{ urls: string[]; key: string }>({
    urls: [],
    key: "",
  });
  // An overlay set that threw on load (e.g. a stale cross-gender url). Don't
  // retry or commit it — keep the previous composite so the skin never breaks.
  const [failedKey, setFailedKey] = useState("");
  const pending =
    requestedKey !== "" &&
    committed.key !== requestedKey &&
    requestedKey !== failedKey;

  const commit = useCallback(() => {
    setCommitted({ urls: requestedUrls, key: requestedKey });
  }, [requestedUrls, requestedKey]);

  // Removing the selected makeup yields an empty requested set. There is no
  // texture to preload in that case, so commit the empty set directly instead
  // of waiting for SkinTextureGate. Without this, the previously committed
  // makeup map stays on the skin.
  useEffect(() => {
    if (requestedKey !== "") return;
    if (committed.key !== "") setCommitted({ urls: [], key: "" });
    if (failedKey !== "") setFailedKey("");
  }, [requestedKey, committed.key, failedKey]);

  // Report per-category loading: a makeup category is loading while its
  // requested texture isn't yet in the committed set. Clear categories we
  // previously flagged once they settle or lose their overlay.
  const flaggedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!setAssetLoading) return;
    const committedSet = new Set(committed.urls);
    const givenUp = requestedKey === failedKey;
    const nextFlagged = new Set<string>();
    Object.entries(requestedByCategory).forEach(([categoryName, url]) => {
      const loading = !givenUp && !committedSet.has(url);
      setAssetLoading(categoryName, loading);
      if (loading) nextFlagged.add(categoryName);
    });
    flaggedRef.current.forEach((categoryName) => {
      if (!nextFlagged.has(categoryName)) setAssetLoading(categoryName, false);
    });
    flaggedRef.current = nextFlagged;
  }, [
    requestedByCategory,
    committed,
    requestedKey,
    failedKey,
    setAssetLoading,
  ]);

  // Composite the committed overlays (already decoded → no suspense here).
  const combinedTexture = useCombinedTexture(committed.urls, rawSkinColor);

  useEffect(() => {
    if (!skinMaterial) return;

    // Without makeup, keep the selected colour directly on the material.
    // This also clears an old makeup map immediately when it is removed.
    if (committed.urls.length === 0) {
      skinMaterial.map = null;
      skinMaterial.color.set(rawSkinColor);
      skinMaterial.needsUpdate = true;
      return;
    }

    if (!combinedTexture) return;
    skinMaterial.map = combinedTexture;
    skinMaterial.color.set("#ffffff");
    skinMaterial.needsUpdate = true;
  }, [combinedTexture, committed.urls.length, rawSkinColor, skinMaterial]);

  return pending ? (
    <EngineErrorBoundary
      label="makeup"
      resetKey={requestedKey}
      onError={() => setFailedKey(requestedKey)}
    >
      <Suspense fallback={null}>
        <SkinTextureGate urls={requestedUrls} onReady={commit} />
      </Suspense>
    </EngineErrorBoundary>
  ) : null;
};
