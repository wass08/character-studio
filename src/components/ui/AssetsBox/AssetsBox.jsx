"use client";

import React from "react";
import { useConfiguratorStore, pb } from "@/stores/useConfiguratorStore";
import { useEffect } from "react";

import "./AssetsBox.css";

const AssetsBox = () => {
  const {
    categories,
    currentCategory,
    fetchCategories,
    setCurrentCategory,
    changeAsset,
    gender,
    resetAllMorphs,
    loading,
    setHeight,
  } = useConfiguratorStore();

  useEffect(() => {
    fetchCategories();
    resetAllMorphs();
    setHeight(1);
  }, [gender]);

  const filteredCategories = categories.filter(
    (cat) => cat.assets && cat.assets.length >= 0,
  );
  const isCurrentCategoryVisible =
    currentCategory && currentCategory.assets?.length >= 0;

  return (
    <>
      <div className="assets-box glass-card">
        {filteredCategories.map((category) => (
          <button
            className={`category-button ${
              currentCategory?.id === category.id ? "active" : ""
            }`}
            key={category.id}
            onClick={() => setCurrentCategory(category)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="assets-box-wrapper glass-card">
        {loading ? (
          <div className="loading-message">Loading Assets...</div>
        ) : (
          isCurrentCategoryVisible && (
            <>
              {currentCategory?.optional && (
                <button
                  onClick={() => changeAsset(currentCategory.name, null)}
                  className="asset-button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}

              {currentCategory?.assets.map((asset) => (
                <button
                  onClick={() => changeAsset(currentCategory.name, asset)}
                  className="asset-button"
                  key={asset.id}
                >
                  <img
                    src={pb.files.getURL(asset, asset.thumbnail)}
                    alt="asset"
                  />
                </button>
              ))}
            </>
          )
        )}
      </div>
    </>
  );
};

export default AssetsBox;
