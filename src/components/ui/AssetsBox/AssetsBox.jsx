"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { useConfiguratorStore, pb } from "@/stores/useConfiguratorStore";
import GenderSelectionBox from "../GenderSelectionBox/GenderSelectionBox";
import { HeightSlider } from "../HeightSlider/HeightSlider";
import {
  CHARACTER_GLOBAL_MORPHS,
  MorphSlider,
} from "../ShapeKeyControls/ShapeKeyControls";
import ColorPicker from "../ColorPicker/ColorPicker";
import { Tooltip } from "../primitives/Tooltip";
import { cn } from "../primitives/cn";

const PILL_SPRING = { type: "spring", stiffness: 380, damping: 32 };
const ASSET_SPRING = { type: "spring", stiffness: 360, damping: 28 };

const SIDEBAR_CLASS = cn(
  "fixed inset-x-0 bottom-0 z-40 flex max-h-[50vh] w-full flex-col-reverse items-stretch gap-1.5 px-2 pb-2",
  "md:absolute md:inset-x-auto md:bottom-auto md:top-1/2 md:left-3 md:max-h-[calc(100vh-32px)] md:w-auto md:-translate-y-1/2 md:flex-row md:items-start md:gap-3 md:px-0 md:pb-0",
);

const TAB_RAIL_CLASS = cn(
  "glass-panel no-scrollbar flex w-full shrink-0 flex-row items-center gap-1 overflow-x-auto rounded-xl px-2 py-1.5",
  "md:max-h-[calc(100vh-32px)] md:w-[68px] md:flex-col md:items-center md:gap-2 md:overflow-x-hidden md:overflow-y-auto md:px-0 md:py-3",
);

const TAB_BUTTON_CLASS =
  "relative inline-flex shrink-0 items-center justify-center rounded-lg p-2.5 transition-colors hover:bg-white/5";

const ACTIVE_PILL_CLASS =
  "absolute inset-1 rounded-md bg-white/10 ring-1 ring-white/25 shadow-[0_0_18px_rgba(255,255,255,0.12)]";

const MaskIcon = ({ url, active }) => (
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

const SectionHeader = ({ children, onReset, resetLabel }) => (
  <div className="mb-2 flex items-center justify-between">
    <h3 className="text-[10px] font-semibold tracking-[0.12em] text-white/70 uppercase">
      {children}
    </h3>
    {onReset && (
      <Tooltip label={resetLabel} side="top">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ResetIcon />
        </button>
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

  return (
    <div className={SIDEBAR_CLASS}>
      {/* Section tabs */}
      <div className={TAB_RAIL_CLASS}>
        {sections.map((section) => {
          const active = activeSectionId === section.id;
          return (
            <Tooltip key={section.id} label={section.name} side="top">
              <button
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
                  />
                </div>
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Category tabs */}
      {!isSkinCategory && (
        <div className={TAB_RAIL_CLASS}>
          {visibleCategories.map((category) => {
            const active = currentCategory?.id === category.id;
            return (
              <Tooltip key={category.id} label={category.name} side="top">
                <button
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
                    />
                  </div>
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}

      {/* Assets / character controls panel */}
      <div
        className={cn(
          "glass-panel thin-scrollbar flex w-full flex-row items-center overflow-x-auto rounded-xl p-3 max-md:max-h-[110px]",
          "md:max-h-[calc(100vh-32px)] md:w-[260px] md:flex-col md:items-start md:overflow-x-hidden md:overflow-y-auto",
          isCharacterSectionActive &&
            isSkinCategory &&
            "max-md:!max-h-[45vh] max-md:!flex-col max-md:!items-stretch max-md:!overflow-x-hidden max-md:!overflow-y-auto",
        )}
      >
        {loading ? (
          <div className="m-auto text-sm text-white/60">Loading assets…</div>
        ) : (
          <div
            className={cn(
              "flex h-full w-max flex-row items-center gap-2",
              "md:h-auto md:w-full md:flex-col md:items-stretch md:gap-0",
              isCharacterSectionActive &&
                isSkinCategory &&
                "max-md:w-full max-md:flex-col max-md:items-stretch max-md:gap-3",
            )}
          >
            {isCharacterSectionActive && (
              <div
                className={cn(
                  "flex h-full flex-row flex-nowrap items-center gap-2.5",
                  "md:h-auto md:w-full md:flex-col md:items-stretch md:gap-3",
                  isSkinCategory &&
                    "max-md:w-full max-md:flex-col max-md:items-stretch",
                )}
              >
                <GenderSelectionBox />
                <HeightSlider />

                {isSkinCategory && (
                  <div
                    className={cn(
                      "shrink-0",
                      "max-md:w-full max-md:border-t max-md:border-white/10 max-md:pt-3",
                      "md:mt-3 md:w-full md:border-t md:border-white/10 md:pt-3",
                    )}
                  >
                    <SectionHeader>Skin Color</SectionHeader>
                    <ColorPicker inline />
                  </div>
                )}

                <div className="md:w-full">
                  <SectionHeader
                    onReset={() => resetMorphSet(CHARACTER_GLOBAL_MORPHS)}
                    resetLabel="Reset body shape"
                  >
                    Body Shape
                  </SectionHeader>
                  <div className="flex flex-col gap-1.5 max-md:w-44">
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
              <p className="px-3 py-2 text-xs text-amber-300/90 max-md:shrink-0">
                Hidden by{" "}
                {lockedGroups[currentCategory.name]
                  .map((asset) => `${asset.name} (${asset.categoryName})`)
                  .join(", ")}
              </p>
            )}

            {isCurrentCategoryVisible && !isSkinCategory && (
              <div
                className={cn(
                  "flex flex-row flex-nowrap items-center gap-2 max-md:w-max",
                  "md:grid md:w-full md:grid-cols-[repeat(auto-fill,minmax(56px,1fr))] md:items-stretch",
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
                    label={asset.name}
                  >
                    <img
                      src={pb.files.getURL(asset, asset.thumbnail)}
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
    </div>
  );
};

export default AssetsBox;

const AssetButton = ({ children, onClick, selected, label }) => (
  <Tooltip label={label} side="top">
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={ASSET_SPRING}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border text-white/80 transition-colors",
        "h-[72px] w-[72px]",
        "md:h-auto md:w-full md:aspect-square",
        selected
          ? "border-white/70 bg-white/12 shadow-[0_0_22px_rgba(255,255,255,0.25)] ring-1 ring-white/60"
          : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]",
      )}
    >
      {children}
    </motion.button>
  </Tooltip>
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
