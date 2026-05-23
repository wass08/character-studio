"use client";

import { useEffect } from "react";
import Scene from "@/components/scene/Scene";
import PosesBox from "@/components/ui/PosesBox/PosesBox";
import PhotoGalleryBox from "@/components/ui/PhotoGalleryBox/PhotoGalleryBox";
import LoadingScreen from "@/components/ui/LoadingScreen/LoadingScreen";
import PlayShell from "./PlayShell";
import NoCharacterOverlay from "./NoCharacterOverlay";
import { useConfiguratorStore, UI_MODES } from "@/stores/useConfiguratorStore";

/**
 * Replaces the in-editor Photobooth.
 * Locks the configurator to PHOTO mode (fixed full-body camera) and shows
 * the same pose pill + gallery the editor used.
 */
const PlaygroundView = () => {
  const setMode = useConfiguratorStore((s) => s.setMode);
  const introFinished = useConfiguratorStore((s) => s.introFinished);

  useEffect(() => {
    setMode(UI_MODES.PHOTO);
  }, [setMode]);

  return (
    <PlayShell title="Playground">
      <Scene />
      {!introFinished && <LoadingScreen />}
      <PosesBox />
      <PhotoGalleryBox />
      <NoCharacterOverlay />
    </PlayShell>
  );
};

export default PlaygroundView;
