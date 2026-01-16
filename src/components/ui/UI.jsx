"use client";

import React from "react";

import AssetsBox from "./AssetsBox/AssetsBox";
import "./UI.css";
import DownloadButton from "./DownloadButton/DownloadButton";
import ColorPicker from "./ColorPicker/ColorPicker";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { HeightSlider } from "./HeightSlider/HeightSlider";
import ShapeKeyControls from "./ShapeKeyControls/ShapeKeyControls";

const UI = () => {
  const customization = useConfiguratorStore((state) => state.customization);
  const currentCategory = useConfiguratorStore(
    (state) => state.currentCategory,
  );
  const detectedMorphsByCategory = useConfiguratorStore(
    (state) => state.detectedMorphsByCategory,
  );
  const activeMorphs = Object.values(detectedMorphsByCategory).flat();
  const uniqueMorphs = [...new Set(activeMorphs)];

  return (
    <>
      <DownloadButton />
      <AssetsBox />
      <HeightSlider />
      {currentCategory?.colorPalette && customization[currentCategory.name] && (
        <ColorPicker />
      )}
      {uniqueMorphs.length > 0 && <ShapeKeyControls />}
    </>
  );
};

export default UI;
