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
  const { currentCategory, customization, detectedMorphs } =
    useConfiguratorStore();

  return (
    <>
      <DownloadButton />
      <AssetsBox />
      <HeightSlider />
      {currentCategory?.colorPalette && customization[currentCategory.name] && (
        <ColorPicker />
      )}
      {detectedMorphs.length > 0 && <ShapeKeyControls />}
    </>
  );
};

export default UI;
