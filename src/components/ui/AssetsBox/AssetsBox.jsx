"use client";

import React from "react";
const { useConfiguratorStore, pb } = require("@/stores/useConfiguratorStore");
const { useEffect } = require("react");

import "./AssetsBox.css";

const AssetsBox = () => {
  const {
    categories,
    currentCategory,
    fetchCategories,
    setCurrentCategory,
    customization,
    changeAsset,
  } = useConfiguratorStore();

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <>
      <div className="assets-box">
        {categories.map((category) => {
          return (
            <button
              className="category-button"
              key={category.id}
              onClick={() => {
                setCurrentCategory(category);
              }}
            >
              {category.name}
            </button>
          );
        })}

        {currentCategory?.assets.map((asset) => (
          <button
            onClick={() => changeAsset(currentCategory.name, asset)}
            className="asset-button"
            key={asset.thumbnail}
          >
            <img src={pb.files.getURL(asset, asset.thumbnail)} alt="asset" />
          </button>
        ))}
      </div>
    </>
  );
};

export default AssetsBox;
