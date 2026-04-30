"use client";

import React, { useState } from "react";

import AssetsBox from "./AssetsBox/AssetsBox";
import DownloadButton from "./Buttons/DownloadButton/DownloadButton";
import ColorPicker from "./ColorPicker/ColorPicker";
import { UI_MODES, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import ShapeKeyControls from "./ShapeKeyControls/ShapeKeyControls";
import RandomizeButton from "./Buttons/RandomizeButton/RandomizeButton";
import PosesBox from "./PosesBox/PosesBox";
import ModeSelector from "./ModeSelector/ModeSelector";
import ScreenshotButton from "./Buttons/ScreenshotButton/ScreenshotButton";
import LoadingScreen from "./LoadingScreen/LoadingScreen";
import Logo from "./Logo/Logo";
import HideUIButton from "./Buttons/HideUIButton/HideUIButton";

const UI = () => {
  const [isHidden, setIsHidden] = useState(false);
  const customization = useConfiguratorStore((state) => state.customization);
  const currentCategory = useConfiguratorStore(
    (state) => state.currentCategory,
  );
  const detectedMorphsByCategory = useConfiguratorStore(
    (state) => state.detectedMorphsByCategory,
  );
  const activeMorphs = Object.values(detectedMorphsByCategory).flat();
  const uniqueMorphs = [...new Set(activeMorphs)];

  const isSkinCategory = currentCategory?.name === "Skin";
  const hasAsset = customization[currentCategory?.name]?.asset;

  const mode = useConfiguratorStore((state) => state.mode);

  const introFinished = useConfiguratorStore((state) => state.introFinished);

  return (
    <>
      <Logo />
      {!introFinished && <LoadingScreen />}
      <RandomizeButton />
      <ScreenshotButton />
      <DownloadButton />
      <ModeSelector />

      <HideUIButton isHidden={isHidden} setIsHidden={setIsHidden} />

      {mode === UI_MODES.CUSTOMIZE && (
        <div className={isHidden ? "max-md:hidden" : ""}>
          {!isSkinCategory && currentCategory?.colorPalette && hasAsset && (
            <ColorPicker />
          )}
          {uniqueMorphs.length > 0 && <ShapeKeyControls />}
          <AssetsBox />
        </div>
      )}

      {mode === UI_MODES.PHOTO && <PosesBox />}
    </>
  );
};

export default UI;
