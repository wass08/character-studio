"use client";

import Link from "next/link";
import { useState } from "react";
import IdleJuice from "@/components/scene/IdleJuice";
import AccountIdentity from "@/components/shell/AccountIdentity";
import CharacterChip from "@/components/shell/CharacterChip";
import { cn } from "@/lib/utils";
import { UI_MODES, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import AssetsBox from "./AssetsBox/AssetsBox";
import BackdropMenu from "./BackdropMenu/BackdropMenu";
import HideUIButton from "./Buttons/HideUIButton/HideUIButton";
import TopActions from "./Buttons/TopActions";
import ColorPicker from "./ColorPicker/ColorPicker";
import ExportBox from "./ExportBox/ExportBox";
import ModeSelector from "./ModeSelector/ModeSelector";
import PhotoGalleryBox from "./PhotoGalleryBox/PhotoGalleryBox";
import PosesBox from "./PosesBox/PosesBox";
import ShapeKeyControls from "./ShapeKeyControls/ShapeKeyControls";

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

  return (
    <>
      <header className="app-topbar absolute inset-x-0 top-0 z-40 flex min-h-15 items-center gap-3 px-5 py-2.5 md:px-8">
        <Link
          href="/"
          className="shrink-0 select-none"
          aria-label="Character Studio home"
        >
          <img
            src="/images/logo-white.svg"
            alt="Character Studio"
            className="h-7 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] md:h-9"
          />
        </Link>

        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 md:top-1/2 md:-translate-y-1/2 md:pt-0">
          <ModeSelector embedded />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden lg:block">
            <CharacterChip />
          </div>
          <BackdropMenu />
          <div className="hidden sm:block">
            <AccountIdentity />
          </div>
          <TopActions />
        </div>
      </header>

      <HideUIButton isHidden={isHidden} setIsHidden={setIsHidden} />

      {mode === UI_MODES.CUSTOMIZE && <IdleJuice />}

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
