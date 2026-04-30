"use client";

import React, { useState } from "react";

import AssetsBox from "./AssetsBox/AssetsBox";
import TopActions from "./Buttons/TopActions";
import ColorPicker from "./ColorPicker/ColorPicker";
import { UI_MODES, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import ShapeKeyControls from "./ShapeKeyControls/ShapeKeyControls";
import PosesBox from "./PosesBox/PosesBox";
import ModeSelector from "./ModeSelector/ModeSelector";
import LoadingScreen from "./LoadingScreen/LoadingScreen";
import Logo from "./Logo/Logo";
import HideUIButton from "./Buttons/HideUIButton/HideUIButton";
import { cn } from "./primitives/cn";

const showColorPicker = (isSkin, currentCategory, hasAsset) =>
  !isSkin && currentCategory?.colorPalette && hasAsset;

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
      <TopActions />
      <ModeSelector />

      <HideUIButton isHidden={isHidden} setIsHidden={setIsHidden} />

      {mode === UI_MODES.CUSTOMIZE && (
        <div className={isHidden ? "max-md:hidden" : ""}>
          {(showColorPicker(isSkinCategory, currentCategory, hasAsset) ||
            uniqueMorphs.length > 0) && (
            <div
              className={cn(
                "absolute right-[clamp(20px,3.5vw,256px)] top-1/2 z-30 flex w-[clamp(300px,28vw,380px)] max-h-[calc(100vh-120px)] -translate-y-1/2 flex-col gap-3",
                "max-md:fixed max-md:top-auto max-md:bottom-[calc(50vh+8px)] max-md:left-2 max-md:right-2 max-md:w-auto max-md:max-h-[55vh] max-md:translate-y-0",
              )}
            >
              {showColorPicker(isSkinCategory, currentCategory, hasAsset) && (
                <ColorPicker />
              )}
              {uniqueMorphs.length > 0 && <ShapeKeyControls />}
            </div>
          )}
          <AssetsBox />
        </div>
      )}

      {mode === UI_MODES.PHOTO && <PosesBox />}
    </>
  );
};

export default UI;
