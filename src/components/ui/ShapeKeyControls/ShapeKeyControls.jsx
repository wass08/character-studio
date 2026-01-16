"use client";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import React, { useMemo } from "react";

import "./ShapeKeyControls.css";

const ShapeKeyControls = () => {
  const detectedMorphsByCategory = useConfiguratorStore(
    (state) => state.detectedMorphsByCategory,
  );
  const morphValues = useConfiguratorStore((state) => state.morphValues);
  const setMorphValue = useConfiguratorStore((state) => state.setMorphValue);

  const morphAnalysis = useMemo(() => {
    const counts = {};
    const categoriesPerMorph = {};

    Object.entries(detectedMorphsByCategory).forEach(([category, keys]) => {
      keys.forEach((key) => {
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

  return (
    <>
      <div className="morph-controls-container">
        <div className="controls-wrapper">
          {universal.length > 0 && (
            <div className="morph-group universal">
              <h4>Global Adjustments</h4>
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

          {specific.length > 0 && (
            <div className="morph-group specific">
              <h4>Item Details</h4>
              {specific.map(({ key, category }) => (
                <MorphSlider
                  key={key}
                  label={`${key} (${category})`}
                  value={morphValues[key]}
                  onChange={(v) => setMorphValue(key, v)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
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
