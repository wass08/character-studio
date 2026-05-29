"use client";

import React, { useState } from "react";

import AssetsBox from "./AssetsBox/AssetsBox";
import ExportBox from "./ExportBox/ExportBox";
import TopActions from "./Buttons/TopActions";
import ColorPicker from "./ColorPicker/ColorPicker";
import { UI_MODES, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import ShapeKeyControls from "./ShapeKeyControls/ShapeKeyControls";
import PosesBox from "./PosesBox/PosesBox";
import ModeSelector from "./ModeSelector/ModeSelector";
import LoadingScreen from "./LoadingScreen/LoadingScreen";
import Logo from "./Logo/Logo";
import HideUIButton from "./Buttons/HideUIButton/HideUIButton";
import AuthDialog from "./AuthDialog/AuthDialog";
import AuthBootstrapper from "./AuthBootstrapper";
import UserMenu from "./UserMenu/UserMenu";
import PhotoGalleryBox from "./PhotoGalleryBox/PhotoGalleryBox";
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
      <ModeSelector />
      <div className="absolute top-5 right-5 z-30 flex items-center gap-2">
        <UserMenu />
        <TopActions />
      </div>
      <AuthDialog />
      <AuthBootstrapper />

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

      {mode === UI_MODES.PHOTO && (
        <>
          <PosesBox />
          <PhotoGalleryBox />
        </>
      )}

      {mode === UI_MODES.EXPORT && <ExportBox />}
    </>
  );
};

export default UI;
