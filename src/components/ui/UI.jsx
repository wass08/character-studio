"use client";

import React from "react";

import AssetsBox from "./AssetsBox/AssetsBox";
import "./UI.css";
import DownloadButton from "./DownloadButton/DownloadButton";
import ColorPicker from "./ColorPicker/ColorPicker";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { HeightSlider } from "./HeightSlider/HeightSlider";

const UI = () => {
  const {
    categories,
    currentCategory,
    fetchCategories,
    setCurrentCategory,
    customization,
    changeAsset,
  } = useConfiguratorStore();

  return (
    <>
      <DownloadButton />
      <AssetsBox />
      <HeightSlider />

      {currentCategory?.colorPalette && customization[currentCategory.name] && (
        <ColorPicker />
      )}
    </>
  );
};

export default UI;
