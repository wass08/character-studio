"use client";

import React, { useEffect } from "react";
import { useConfiguratorStore, UI_MODES } from "@/stores/useConfiguratorStore";

import "./ModeSelector.css";

const ModeSelector = () => {
  const setMode = useConfiguratorStore((state) => state.setMode);

  return (
    <>
      <div className="mode-selector">
        <button
          onClick={() => {
            setMode(UI_MODES.CUSTOMIZE);
          }}
          className="mode-button"
        >
          Customize Avatar
        </button>
        <button
          onClick={() => {
            setMode(UI_MODES.PHOTO);
          }}
          className="mode-button"
        >
          Photobooth
        </button>
      </div>
    </>
  );
};

export default ModeSelector;
