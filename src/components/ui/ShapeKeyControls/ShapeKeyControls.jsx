"use client";
import {
  hiddenPrefixes,
  useConfiguratorStore,
} from "@/stores/useConfiguratorStore";
import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Tooltip } from "../primitives/Tooltip";
import { cn } from "../primitives/cn";

export const CHARACTER_GLOBAL_MORPHS = [
  "Body Size",
  "Muscularity",
  "Eye Spacing",
];

const ShapeKeyControls = () => {
  const detectedMorphsByCategory = useConfiguratorStore(
    (state) => state.detectedMorphsByCategory,
  );
  const currentCategory = useConfiguratorStore(
    (state) => state.currentCategory,
  );
  const categories = useConfiguratorStore((state) => state.categories);

  const morphValues = useConfiguratorStore((state) => state.morphValues);
  const setMorphValue = useConfiguratorStore((state) => state.setMorphValue);
  const resetMorphSet = useConfiguratorStore((state) => state.resetMorphSet);

  const [isUniversalOpen, setIsUniversalOpen] = useState(true);
  const [isSpecificOpen, setIsSpecificOpen] = useState(true);

  const morphAnalysis = useMemo(() => {
    if (
      !currentCategory ||
      !categories.length ||
      Object.keys(detectedMorphsByCategory).length === 0
    ) {
      return { universal: [], specific: [] };
    }

    const currentCategoryName = currentCategory.name || currentCategory;
    const activeCategoryObj = categories.find(
      (c) => c.name === currentCategoryName,
    );

    if (!activeCategoryObj) return { universal: [], specific: [] };

    const currentSectionId = activeCategoryObj.section;

    const sectionCategories = categories
      .filter((c) => c.section === currentSectionId)
      .map((c) => c.name);

    const counts = {};
    const categoriesPerMorph = {};

    sectionCategories.forEach((catName) => {
      const keys = detectedMorphsByCategory[catName];
      if (!keys) return;

      keys.forEach((key) => {
        const isHidden = hiddenPrefixes.some((prefix) =>
          key.toLowerCase().startsWith(prefix.toLowerCase()),
        );

        const isCharacterGlobal = CHARACTER_GLOBAL_MORPHS.some(
          (g) => g.toLowerCase() === key.toLowerCase(),
        );

        if (isHidden || isCharacterGlobal) return;

        counts[key] = (counts[key] || 0) + 1;
        if (!categoriesPerMorph[key]) categoriesPerMorph[key] = [];
        categoriesPerMorph[key].push(catName);
      });
    });

    const universal = [];
    const specific = [];

    Object.keys(counts).forEach((key) => {
      if (counts[key] > 1) {
        universal.push(key);
      } else {
        specific.push({ key, category: categoriesPerMorph[key][0] });
      }
    });

    return { universal, specific };
  }, [detectedMorphsByCategory, currentCategory, categories]);

  const { universal, specific } = morphAnalysis;

  const activeSpecificMorphs = useMemo(() => {
    if (!currentCategory) return [];
    const name = currentCategory.name || currentCategory;
    return specific.filter((s) => s.category === name);
  }, [specific, currentCategory]);

  if (universal.length === 0 && activeSpecificMorphs.length === 0) return null;

  return (
    <div
      className={cn(
        "glass-panel thin-scrollbar absolute z-30 flex max-h-[clamp(140px,40vh,320px)] flex-col gap-3 overflow-hidden rounded-xl p-4 text-white",
        "right-[clamp(20px,3.5vw,256px)] top-1/2 w-[clamp(300px,28vw,380px)] -translate-y-1/2",
        "max-md:fixed max-md:top-auto max-md:right-2 max-md:left-2 max-md:bottom-[calc(55vh+8px)] max-md:w-auto max-md:max-h-[28vh] max-md:translate-y-0",
      )}
    >
      {universal.length > 0 && (
        <MorphGroup
          title="Section Adjustments"
          isOpen={isUniversalOpen}
          onToggle={() => setIsUniversalOpen((v) => !v)}
          onReset={() => resetMorphSet(universal)}
          resetLabel="Reset section"
        >
          {universal.map((key) => (
            <MorphSlider
              key={key}
              label={key}
              value={morphValues[key]}
              onChange={(v) => setMorphValue(key, v)}
            />
          ))}
        </MorphGroup>
      )}

      {universal.length > 0 && activeSpecificMorphs.length > 0 && (
        <div className="h-px w-full shrink-0 bg-white/10" />
      )}

      {activeSpecificMorphs.length > 0 && (
        <MorphGroup
          title={currentCategory?.name || currentCategory}
          isOpen={isSpecificOpen}
          onToggle={() => setIsSpecificOpen((v) => !v)}
          onReset={() =>
            resetMorphSet(activeSpecificMorphs.map((s) => s.key))
          }
          resetLabel="Reset category"
        >
          {activeSpecificMorphs.map(({ key }) => (
            <MorphSlider
              key={key}
              label={key}
              value={morphValues[key]}
              onChange={(v) => setMorphValue(key, v)}
            />
          ))}
        </MorphGroup>
      )}
    </div>
  );
};

export default ShapeKeyControls;

const MorphGroup = ({
  title,
  isOpen,
  onToggle,
  onReset,
  resetLabel,
  children,
}) => (
  <div className="flex min-h-0 w-full flex-col">
    <div className="mb-2.5 flex items-center justify-between">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 text-left transition-opacity hover:opacity-80"
      >
        <motion.span
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className="inline-flex h-3 w-3 items-center justify-center text-white/70"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="h-3 w-3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </motion.span>
        <h3 className="text-[10px] font-semibold tracking-[0.14em] text-white/70 uppercase">
          {title}
        </h3>
      </button>
      <Tooltip label={resetLabel} side="top">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ResetIcon />
        </button>
      </Tooltip>
    </div>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="thin-scrollbar flex max-h-[clamp(80px,14vh,170px)] flex-col gap-2 overflow-y-auto pr-1">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
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

export const MorphSlider = ({ label, value, onChange }) => {
  const numericValue = value || 0;
  const displayValue = numericValue.toFixed(2);
  const fillWidth = `calc(2px + ${numericValue} * (100% - 4px))`;

  return (
    <div
      className="group relative flex h-10 items-center overflow-hidden rounded-md border border-white/[0.05] bg-black/25 px-3 transition-colors hover:border-white/15 hover:bg-black/30 focus-within:border-white/15 focus-within:bg-black/30"
      onMouseLeave={(e) => e.currentTarget.querySelector("input")?.blur()}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 rounded-md bg-white/[0.04] transition-colors group-hover:bg-white/[0.10] group-focus-within:bg-white/[0.10]"
        style={{ width: fillWidth }}
      />
      <span className="pointer-events-none relative z-[1] flex-1 truncate text-[10px] font-medium tracking-wide text-white/45 transition-colors select-none group-hover:text-white/90 group-focus-within:text-white/90">
        {label}
      </span>
      <span className="pointer-events-none relative z-[1] min-w-[2.4ch] text-right text-[10px] font-normal tracking-wide text-white/80 opacity-0 transition-opacity select-none group-hover:opacity-100 group-focus-within:opacity-100">
        {displayValue}
      </span>
      <input
        className={cn(
          "absolute inset-y-0 left-[2px] right-[2px] z-[2] cursor-pointer appearance-none bg-transparent",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-[2px] [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-white/35 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-colors",
          "group-hover:[&::-webkit-slider-thumb]:bg-white group-focus-within:[&::-webkit-slider-thumb]:bg-white",
          "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-[2px] [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white/35 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:transition-colors",
          "group-hover:[&::-moz-range-thumb]:bg-white group-focus-within:[&::-moz-range-thumb]:bg-white",
        )}
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={numericValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
};
