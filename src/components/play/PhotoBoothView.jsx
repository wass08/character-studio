"use client";

import { useEffect } from "react";
import Scene from "@/components/scene/SceneDynamic";
import BackdropMenu from "@/components/ui/BackdropMenu/BackdropMenu";
import PhotoGalleryBox from "@/components/ui/PhotoGalleryBox/PhotoGalleryBox";
import PhotoGallerySheet from "@/components/ui/PhotoGalleryBox/PhotoGallerySheet";
import PosesBox from "@/components/ui/PosesBox/PosesBox";
import { UI_MODES, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import NoCharacterOverlay from "./NoCharacterOverlay";
import PhotoFramingBar from "./PhotoFramingBar";
import PhotoFramingOverlay from "./PhotoFramingOverlay";
import PlayShell from "./PlayShell";

const PhotoBoothView = () => {
  const setMode = useConfiguratorStore((s) => s.setMode);

  useEffect(() => {
    setMode(UI_MODES.PHOTO);
  }, [setMode]);

  return (
    <PlayShell title="Photo Booth" actions={<BackdropMenu />}>
      <Scene />
      <PhotoFramingOverlay />
      <PosesBox />
      <PhotoGalleryBox />
      <PhotoGallerySheet />
      <PhotoFramingBar />
      <NoCharacterOverlay />
    </PlayShell>
  );
};

export default PhotoBoothView;
