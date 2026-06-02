"use client";

import { useEffect } from "react";
import Scene from "@/components/scene/SceneDynamic";
import LoadingScreen from "@/components/ui/LoadingScreen/LoadingScreen";
import PhotoGalleryBox from "@/components/ui/PhotoGalleryBox/PhotoGalleryBox";
import PhotoGallerySheet from "@/components/ui/PhotoGalleryBox/PhotoGallerySheet";
import PosesBox from "@/components/ui/PosesBox/PosesBox";
import { UI_MODES, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import BackdropPicker from "./BackdropPicker";
import NoCharacterOverlay from "./NoCharacterOverlay";
import PhotoFramingBar from "./PhotoFramingBar";
import PhotoFramingOverlay from "./PhotoFramingOverlay";
import PlayShell from "./PlayShell";

const PhotoBoothView = () => {
  const setMode = useConfiguratorStore((s) => s.setMode);
  const introFinished = useConfiguratorStore((s) => s.introFinished);

  useEffect(() => {
    setMode(UI_MODES.PHOTO);
  }, [setMode]);

  return (
    <PlayShell title="Photo Booth">
      <Scene />
      {!introFinished && <LoadingScreen />}
      <PhotoFramingOverlay />
      <BackdropPicker />
      <PosesBox />
      <PhotoGalleryBox />
      <PhotoGallerySheet />
      <PhotoFramingBar />
      <NoCharacterOverlay />
    </PlayShell>
  );
};

export default PhotoBoothView;
