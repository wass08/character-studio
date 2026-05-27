"use client";

import { useEffect } from "react";
import Scene from "@/components/scene/Scene";
import PosesBox from "@/components/ui/PosesBox/PosesBox";
import PhotoGalleryBox from "@/components/ui/PhotoGalleryBox/PhotoGalleryBox";
import PhotoGallerySheet from "@/components/ui/PhotoGalleryBox/PhotoGallerySheet";
import LoadingScreen from "@/components/ui/LoadingScreen/LoadingScreen";
import PlayShell from "./PlayShell";
import NoCharacterOverlay from "./NoCharacterOverlay";
import BackdropPicker from "./BackdropPicker";
import { useConfiguratorStore, UI_MODES } from "@/stores/useConfiguratorStore";

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
      <BackdropPicker />
      <PosesBox />
      <PhotoGalleryBox />
      <PhotoGallerySheet />
      <NoCharacterOverlay />
    </PlayShell>
  );
};

export default PlaygroundView;
