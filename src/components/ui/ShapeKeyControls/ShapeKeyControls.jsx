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
  ); // Get current category
  const morphValues = useConfiguratorStore((state) => state.morphValues);
  const setMorphValue = useConfiguratorStore((state) => state.setMorphValue);
  const resetAllMorphs = useConfiguratorStore((state) => state.resetAllMorphs);
  const resetMorphSet = useConfiguratorStore((state) => state.resetMorphSet);

  const morphAnalysis = useMemo(() => {
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

    Object.entries(detectedMorphsByCategory).forEach(([category, keys]) => {
      keys.forEach((key) => {
        const isHidden = hiddenPrefixes.some((prefix) =>
          key.toLowerCase().startsWith(prefix.toLowerCase()),
        );

        if (isHidden) return;

        counts[key] = (counts[key] || 0) + 1;
        if (!categoriesPerMorph[key]) categoriesPerMorph[key] = [];
        categoriesPerMorph[key].push(category);
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
  }, [detectedMorphsByCategory]);

  const { universal, specific } = morphAnalysis;

  const activeSpecificMorphs = useMemo(() => {
    if (!currentCategory) return [];
    return specific.filter((s) => s.category === currentCategory.name);
  }, [specific, currentCategory]);

  if (universal.length === 0 && activeSpecificMorphs.length === 0) return null;

  return (
    <div className="shape-key-container">
      <div className="shape-key-header">
        <h3>Adjustments</h3>
        <button className="reset-btn-main" onClick={resetAllMorphs}>
          Reset All
        </button>
      </div>

      {universal.length > 0 && (
        <div className="morph-group">
          <div className="group-label">
            <span>Global</span>
            <button onClick={() => resetMorphSet(universal)}>
              Reset Global
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

      {activeSpecificMorphs.length > 0 && (
        <div className="morph-group">
          <div className="group-label">
            <span>{currentCategory?.name} Controls</span>
            <button
              onClick={() =>
                resetMorphSet(activeSpecificMorphs.map((s) => s.key))
              }
            >
              Reset {currentCategory?.name}
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
  );
};

export default ShapeKeyControls;

const MorphSlider = ({ label, value, onChange }) => (
  <div className="slider-item">
    <label>{label}</label>
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={value || 0}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </div>
);
