"use client";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import React from "react";

import "./ShapeKeyControls.css";

const ShapeKeyControls = () => {
  const detectedMorphsByCategory = useConfiguratorStore(
    (state) => state.detectedMorphsByCategory,
  );
  const morphValues = useConfiguratorStore((state) => state.morphValues);
  const setMorphValue = useConfiguratorStore((state) => state.setMorphValue);
  const uniqueMorphs = [
    ...new Set(Object.values(detectedMorphsByCategory).flat()),
  ];

  return (
    <>
      <div className="morph-controls-container">
        {uniqueMorphs.map((key) => (
          <div key={key}>
            <label>{key}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={morphValues[key] || 0}
              onChange={(e) => setMorphValue(key, parseFloat(e.target.value))}
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default ShapeKeyControls;
