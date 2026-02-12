"use client";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import React, { useMemo } from "react";

import "./ShapeKeyControls.css";

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

    const hiddenPrefixes = [
      "viseme",
      "eyeBlink",
      "eyeLook",
      "eyeWide",
      "eyeSquint",
      "brow",
      "jaw",
      "mouth",
      "cheekPuff",
      "cheekSquint",
      "noseSneer",
      "tongueOut",
    ];

    sectionCategories.forEach((catName) => {
      const keys = detectedMorphsByCategory[catName];
      if (!keys) return;

      keys.forEach((key) => {
        const isHidden = hiddenPrefixes.some((prefix) =>
          key.toLowerCase().startsWith(prefix.toLowerCase()),
        );

        if (isHidden) return;

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
    <>
      <div className="shape-key-container">
        {universal.length > 0 && (
          <div className="morph-group">
            <div className="shape-key-header">
              <h3>Section Adjustments</h3>
              <button
                className="reset-button"
                onClick={() => resetMorphSet(universal)}
              >
                <ResetIcon />
              </button>
            </div>
            {universal.map((key) => (
              <MorphSlider
                key={key}
                label={key}
                value={morphValues[key]}
                onChange={(v) => setMorphValue(key, v)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="shape-key-container-category">
        {activeSpecificMorphs.length > 0 && (
          <div className="morph-group">
            <div className="shape-key-header">
              <h3>{currentCategory?.name || currentCategory}</h3>
              <button
                className="reset-button"
                onClick={() =>
                  resetMorphSet(activeSpecificMorphs.map((s) => s.key))
                }
              >
                <ResetIcon />
              </button>
            </div>
            {activeSpecificMorphs.map(({ key }) => (
              <MorphSlider
                key={key}
                label={key}
                value={morphValues[key]}
                onChange={(v) => setMorphValue(key, v)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ShapeKeyControls;

const ResetIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6 reset-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const MorphSlider = ({ label, value, onChange }) => (
  <div className="slider-item">
    <label className="slider-label">{label}</label>
    <input
      className="slider-input"
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={value || 0}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </div>
);
