"use client";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import React from "react";

import "./ShapeKeyControls.css";

const ShapeKeyControls = () => {
  const detectedMorphs = useConfiguratorStore((state) => state.detectedMorphs);
  const morphValues = useConfiguratorStore((state) => state.morphValues);
  const setMorphValue = useConfiguratorStore((state) => state.setMorphValue);

  return (
    <>
      <div className="morph-controls-container">
        <h3>Character Adjustments</h3>
        {detectedMorphs.map((key) => (
          <div key={key} className="morph-control">
            <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
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
