"use client";

import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import type { Skeleton } from "three";
import { Asset } from "./Asset";
import { useCharacter } from "./CharacterContext";
import { EngineErrorBoundary } from "./EngineErrorBoundary";

type DeferredAssetProps = {
  url: string;
  categoryName: string;
  skeleton: Skeleton;
};

// Loads `url` (suspends inside the parent Suspense whose fallback is null),
// then fires `onReady` once it's in drei's GLTF cache. Renders nothing — it
// exists only to drive the preload + signal readiness without disturbing the
// part that's currently on screen.
const AssetGate = ({
  url,
  onReady,
}: {
  url: string;
  onReady: (url: string) => void;
}) => {
  useGLTF(url);
  useEffect(() => {
    onReady(url);
  }, [url, onReady]);
  return null;
};

// Keeps the currently-committed part visible while a newly-requested part
// preloads off-screen, then swaps in a single commit. The old mesh never
// vanishes mid-swap (no Suspense gap on the visible tree); the asset panel
// spins the thumbnail being applied via `setAssetLoading`. Mounted with a
// stable per-category key so it survives asset changes instead of remounting.
export const DeferredAsset = ({
  url,
  categoryName,
  skeleton,
}: DeferredAssetProps) => {
  const { setAssetLoading } = useCharacter();
  const [committedUrl, setCommittedUrl] = useState<string | null>(null);
  // A url that threw on load — don't retry it (and don't keep spinning) until
  // the user picks something else.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const pending = url !== committedUrl && url !== failedUrl;

  useEffect(() => {
    setAssetLoading?.(categoryName, pending);
  }, [pending, categoryName, setAssetLoading]);

  // Clear the loading flag if this category unmounts mid-load (e.g. the user
  // removes the part, or swaps gender) so the panel doesn't spin forever.
  useEffect(() => {
    return () => setAssetLoading?.(categoryName, false);
  }, [categoryName, setAssetLoading]);

  return (
    <EngineErrorBoundary
      label={`part:${categoryName}`}
      resetKey={`${committedUrl ?? ""}|${url}`}
      onError={() => setFailedUrl(url)}
    >
      {committedUrl && (
        <Asset
          key={committedUrl}
          categoryName={categoryName}
          url={committedUrl}
          skeleton={skeleton}
        />
      )}
      {pending && (
        <Suspense fallback={null}>
          <AssetGate url={url} onReady={setCommittedUrl} />
        </Suspense>
      )}
    </EngineErrorBoundary>
  );
};
