"use client";

import React from "react";

import AssetsBox from "./AssetsBox/AssetsBox";
import "./UI.css";
import DownloadButton from "./Buttons/DownloadButton/DownloadButton";
import ColorPicker from "./ColorPicker/ColorPicker";
import { UI_MODES, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { HeightSlider } from "./HeightSlider/HeightSlider";
import ShapeKeyControls from "./ShapeKeyControls/ShapeKeyControls";
import RandomizeButton from "./Buttons/RandomizeButton/RandomizeButton";
import PosesBox from "./PosesBox/PosesBox";
import ModeSelector from "./ModeSelector/ModeSelector";
import ScreenshotButton from "./Buttons/ScreenshotButton/ScreenshotButton";
import LoadingScreen from "./LoadingScreen/LoadingScreen";
import Logo from "./Logo/Logo";
import GenderSelectionBox from "./GenderSelectionBox/GenderSelectionBox";

const UI = () => {
  const customization = useConfiguratorStore((state) => state.customization);
  const currentCategory = useConfiguratorStore(
    (state) => state.currentCategory,
  );
  const detectedMorphsByCategory = useConfiguratorStore(
    (state) => state.detectedMorphsByCategory,
  );
  const activeMorphs = Object.values(detectedMorphsByCategory).flat();
  const uniqueMorphs = [...new Set(activeMorphs)];

  const isSkinCategory = currentCategory?.name === "skin";
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
      <HeightSlider />
      <ModeSelector />

      <GenderSelectionBox />

      {mode === UI_MODES.CUSTOMIZE && (
        <>
          {(isSkinCategory || (currentCategory?.colorPalette && hasAsset)) && (
            <ColorPicker />
          )}
          <AssetsBox />
        </>
      )}
      {mode === UI_MODES.PHOTO && <PosesBox />}

      {uniqueMorphs.length > 0 && <ShapeKeyControls />}
    </>
  );
};

export default UI;
