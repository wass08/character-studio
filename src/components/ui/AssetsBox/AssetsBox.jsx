"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useConfiguratorStore, pb } from "@/stores/useConfiguratorStore";
import CharacterNameField from "../CharacterNameField/CharacterNameField";
import GenderSelectionBox from "../GenderSelectionBox/GenderSelectionBox";
import { HeightSlider } from "../HeightSlider/HeightSlider";
import {
  CHARACTER_GLOBAL_MORPHS,
  MorphSlider,
} from "../ShapeKeyControls/ShapeKeyControls";
import ColorPicker from "../ColorPicker/ColorPicker";
import { Tooltip } from "../primitives/Tooltip";
import Spinner from "../Spinner/Spinner";
import { cn } from "@/lib/utils";

const PILL_SPRING = { type: "spring", stiffness: 380, damping: 32 };
const ASSET_SPRING = { type: "spring", stiffness: 360, damping: 28 };
const MotionButton = motion.button;

const SIDEBAR_CLASS = cn(
  "fixed inset-x-0 bottom-0 z-40 flex max-h-[55vh] w-full flex-col-reverse items-stretch gap-2 px-2 pb-2",
  "md:absolute md:inset-x-auto md:bottom-auto md:top-1/2 md:left-4 md:max-h-[calc(100vh-32px)] md:w-auto md:-translate-y-1/2 md:flex-row md:items-start md:gap-3 md:px-0 md:pb-0",
);

const NAV_PANEL_CLASS = cn(
  "glass-panel flex shrink-0 rounded-xl p-1.5 gap-1.5",
  "max-md:flex-col-reverse",
  "md:flex-row md:max-h-[calc(100vh-32px)]",
);

const SECTIONS_RAIL_CLASS = cn(
  "no-scrollbar flex gap-0.5",
  "max-md:w-full max-md:flex-row max-md:overflow-x-auto",
  "md:flex-col md:overflow-y-auto md:max-h-full",
);

const CATEGORIES_RAIL_CLASS = cn(
  "no-scrollbar flex gap-0.5 rounded-lg bg-white/[0.04] p-1 ring-1 ring-white/[0.04]",
  "max-md:w-full max-md:flex-row max-md:overflow-x-auto",
  "md:flex-col md:overflow-y-auto md:max-h-full",
);

const TAB_BUTTON_CLASS =
  "relative h-auto shrink-0 rounded-lg p-2.5 transition-colors hover:bg-white/[0.05]";

const ACTIVE_PILL_CLASS =
  "absolute inset-0 rounded-lg bg-white/[0.12] ring-1 ring-white/20 shadow-[0_0_18px_rgba(255,255,255,0.08)]";

const ASSETS_PANEL_CLASS = cn(
  "glass-panel thin-scrollbar flex w-full flex-row items-center overflow-x-auto rounded-xl p-4",
  "max-md:max-h-[120px]",
  "md:max-h-[calc(100vh-32px)] md:w-[280px] md:flex-col md:items-start md:overflow-x-hidden md:overflow-y-auto",
);

// Categories/sections without an uploaded icon used to render as
// invisible blank buttons (CSS mask with a broken URL). Fall back to a
// first-letter glyph so newly added groups stay clickable until an icon
// is uploaded in /admin.
const MaskIcon = ({ url, active, fallbackLabel }) => {
  const hasIcon = Boolean(url && !url.endsWith("/"));
  if (!hasIcon) {
    return (
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold uppercase transition-colors duration-200 md:h-7 md:w-7",
          active ? "bg-white/15 text-white" : "bg-white/[0.06] text-white/55",
        )}
        aria-hidden="true"
      >
        {fallbackLabel?.slice(0, 1) || "?"}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "h-6 w-6 transition-colors duration-200 md:h-7 md:w-7",
        active ? "bg-white" : "bg-white/55",
      )}
      style={{
        maskImage: `url(${url})`,
        WebkitMaskImage: `url(${url})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
};

const SectionHeader = ({ children, onReset, resetLabel }) => (
  <div className="mb-2.5 flex items-center justify-between px-0.5">
    <h3 className="text-[10px] font-semibold tracking-[0.14em] text-white/65 uppercase">
      {children}
    </h3>
    {onReset && (
      <Tooltip label={resetLabel} side="top">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReset}
          className="h-6 w-6 rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ResetIcon />
        </Button>
      </Tooltip>
    )}
  </div>
);

const AssetsBox = () => {
  const {
    sections,
    categories,
    currentCategory,
    fetchCategories,
    setCurrentCategory,
    changeAsset,
    gender,
    resetAllMorphs,
    loading,
    setHeight,
    morphValues,
    setMorphValue,
    resetMorphSet,
    activeSectionId,
    setActiveSectionId,
    lockedGroups,
    customization,
    randomize,
    assetLoading,
  } = useConfiguratorStore();

  const prevGenderRef = useRef(null);

  useEffect(() => {
    if (prevGenderRef.current === null) {
      prevGenderRef.current = gender;
      fetchCategories();
      return;
    }

    if (prevGenderRef.current !== gender) {
      prevGenderRef.current = gender;
      fetchCategories();
      resetAllMorphs();
      setHeight(1);
    }
  }, [gender]);

  const characterSection = useMemo(
    () => sections.find((s) => s.name === "Character"),
    [sections],
  );

  const isCharacterSectionActive = activeSectionId === characterSection?.id;
  const isSkinCategory = currentCategory?.name?.toLowerCase() === "skin";

  const categoriesBySection = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      const isSkin = cat.name?.toLowerCase() === "skin";
      const hasAssets = cat.assets && cat.assets.length > 0;
      if (isSkin || hasAssets) {
        const sectionId = cat.expand?.section?.id || "unassigned";
        if (!map[sectionId]) map[sectionId] = [];
        map[sectionId].push(cat);
      }
    });
    return map;
  }, [categories]);

  useEffect(() => {
    if (!activeSectionId && sections.length > 0) {
      const firstSectionId = sections[0].id;
      setActiveSectionId(firstSectionId);
      const firstCat = categories.find(
        (c) => c.expand?.section?.id === firstSectionId,
      );
      if (firstCat) setCurrentCategory(firstCat);
    }
  }, [
    sections,
    categories,
    setActiveSectionId,
    setCurrentCategory,
    activeSectionId,
  ]);

  const visibleCategories = categoriesBySection[activeSectionId] || [];
  const isCurrentCategoryVisible =
    currentCategory &&
    (currentCategory.assets?.length >= 0 ||
      currentCategory.name?.toLowerCase() === "skin");

  const selectedAssetId = customization[currentCategory?.name]?.asset?.id;
  // The engine flips this while it preloads the requested part and keeps the
  // current one on screen. Only the selected (requested) thumbnail can be
  // pending, so the spinner rides whichever thumbnail the user just applied.
  const isCurrentCategoryLoading = Boolean(assetLoading?.[currentCategory?.name]);

  // No choice to make: required category with a single option.
  const hasNoChoice =
    !!currentCategory &&
    !currentCategory.optional &&
    (currentCategory.assets?.length ?? 0) <= 1;

  // The Character section always has its own controls (gender/height/body),
  // so only collapse the panel for plain asset categories.
  const showAssetsPanel = loading || isCharacterSectionActive || !hasNoChoice;

  return (
    <div className={SIDEBAR_CLASS}>
      {/* Nav panel: sections directly on panel, categories in nested lighter sub-box */}
      <div className={NAV_PANEL_CLASS}>
        <div className={SECTIONS_RAIL_CLASS}>
          {sections.map((section) => {
            const active = activeSectionId === section.id;
            return (
              <Tooltip key={section.id} label={section.name} side="top">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setActiveSectionId(section.id);
                    const firstCat = categoriesBySection[section.id]?.[0];
                    if (firstCat) setCurrentCategory(firstCat);
                  }}
                  className={TAB_BUTTON_CLASS}
                >
                  {active && (
                    <motion.div
                      layoutId="active-section-pill"
                      transition={PILL_SPRING}
                      className={ACTIVE_PILL_CLASS}
                    />
                  )}
                  <div className="relative">
                    <MaskIcon
                      url={pb.files.getURL(section, section.icon)}
                      active={active}
                      fallbackLabel={section.name}
                    />
                  </div>
                </Button>
              </Tooltip>
            );
          })}
          <Tooltip label="Randomize" side="top">
            <Button
              type="button"
              variant="ghost"
              onClick={randomize}
              className={cn(
                TAB_BUTTON_CLASS,
                "text-white/55 hover:text-white",
              )}
            >
              <RandomizeIcon />
            </Button>
          </Tooltip>
        </div>

        {!isSkinCategory && visibleCategories.length > 0 && (
          <div className={CATEGORIES_RAIL_CLASS}>
              {visibleCategories.map((category) => {
                const active = currentCategory?.id === category.id;
                return (
                  <Tooltip key={category.id} label={category.name} side="top">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setCurrentCategory(category)}
                      className={TAB_BUTTON_CLASS}
                    >
                      {active && (
                        <motion.div
                          layoutId="active-category-pill"
                          transition={PILL_SPRING}
                          className={ACTIVE_PILL_CLASS}
                        />
                      )}
                      <div className="relative">
                        <MaskIcon
                          url={pb.files.getURL(category, category.icon)}
                          active={active}
                          fallbackLabel={category.name}
                        />
                      </div>
                    </Button>
                  </Tooltip>
                );
              })}
            </div>
        )}
      </div>

      {/* Assets panel */}
      {showAssetsPanel && (
      <div className={ASSETS_PANEL_CLASS}>
        {loading ? (
          <div className="m-auto text-sm text-white/60">Loading assets…</div>
        ) : (
          <div
            className={cn(
              "flex h-full w-max flex-row items-center gap-3",
              "md:h-auto md:w-full md:flex-col md:items-stretch md:gap-0",
              isCharacterSectionActive &&
                isSkinCategory &&
                "max-md:w-full max-md:flex-col max-md:items-stretch max-md:gap-3",
            )}
          >
            {isCharacterSectionActive && (
              <div
                className={cn(
                  "flex h-full flex-row flex-nowrap items-center gap-3",
                  "md:h-auto md:w-full md:flex-col md:items-stretch md:gap-3.5",
                  isSkinCategory &&
                    "max-md:w-full max-md:flex-col max-md:items-stretch",
                )}
              >
                <CharacterNameField />
                <GenderSelectionBox />
                <HeightSlider />

                {isSkinCategory && (
                  <div
                    className={cn(
                      "shrink-0",
                      "max-md:w-full max-md:border-t max-md:border-white/[0.08] max-md:pt-3",
                      "md:mt-1 md:w-full md:border-t md:border-white/[0.08] md:pt-3.5",
                    )}
                  >
                    <SectionHeader>Skin Color</SectionHeader>
                    <ColorPicker inline />
                  </div>
                )}

                <div className="md:w-full md:border-t md:border-white/[0.08] md:pt-3.5">
                  <SectionHeader
                    onReset={() => resetMorphSet(CHARACTER_GLOBAL_MORPHS)}
                    resetLabel="Reset body shape"
                  >
                    Body Shape
                  </SectionHeader>
                  <div className="flex flex-col gap-2 max-md:w-44">
                    {CHARACTER_GLOBAL_MORPHS.map((key) => (
                      <MorphSlider
                        key={key}
                        label={key}
                        value={morphValues[key]}
                        onChange={(v) => setMorphValue(key, v)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {lockedGroups[currentCategory?.name] && (
              <p className="px-2 py-2 text-xs text-amber-300/90 max-md:shrink-0">
                Hidden by{" "}
                {lockedGroups[currentCategory.name]
                  .map((asset) => `${asset.name} (${asset.categoryName})`)
                  .join(", ")}
              </p>
            )}

            {isCurrentCategoryVisible && !isSkinCategory && !hasNoChoice && (
              <div
                className={cn(
                  "flex flex-row flex-nowrap items-center gap-2.5 max-md:w-max",
                  "md:grid md:w-full md:grid-cols-[repeat(auto-fill,minmax(60px,1fr))] md:gap-2 md:items-stretch",
                  isCharacterSectionActive && "md:mt-3",
                )}
              >
                {currentCategory?.optional && (
                  <AssetButton
                    onClick={() => changeAsset(currentCategory.name, null)}
                    selected={!selectedAssetId}
                    label="None"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </AssetButton>
                )}

                {currentCategory?.assets.map((asset) => (
                  <AssetButton
                    key={asset.id}
                    onClick={() => changeAsset(currentCategory.name, asset)}
                    selected={asset.id === selectedAssetId}
                    loading={asset.id === selectedAssetId && isCurrentCategoryLoading}
                    label={asset.name}
                    backgroundColor={asset.thumbnailBg}
                  >
                    <img
                      src={
                        asset.r2ThumbnailUrl ||
                        pb.files.getURL(asset, asset.thumbnail)
                      }
                      alt={asset.name || "asset"}
                      className="h-full w-full object-contain"
                    />
                  </AssetButton>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default AssetsBox;

const AssetButton = ({
  children,
  onClick,
  selected,
  loading,
  label,
  backgroundColor,
}) => (
  <Tooltip label={label} side="top">
    <Button
      asChild
      variant="ghost"
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border p-1.5 text-white/80 transition-colors",
        "h-[72px] w-[72px]",
        "md:h-auto md:w-full md:aspect-square",
        selected
          ? "border-white/70 shadow-[0_0_22px_rgba(255,255,255,0.22)] ring-1 ring-white/55"
          : "border-white/[0.08] hover:border-white/25",
        // Only fall back to the glass tint when no per-asset color is set,
        // otherwise it muddies bright/light backgrounds.
        !backgroundColor && (selected ? "bg-white/[0.10]" : "bg-white/[0.03] hover:bg-white/[0.06]"),
      )}
    >
      <MotionButton
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={ASSET_SPRING}
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        {children}
        {loading && (
          <span className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/45 backdrop-blur-[1px]">
            <Spinner className="h-5 w-5 border-[2.5px]" />
          </span>
        )}
      </MotionButton>
    </Button>
  </Tooltip>
);

const RandomizeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-6 w-6 md:h-7 md:w-7"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3"
    />
  </svg>
);

const ResetIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
    className="h-3.5 w-3.5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);
