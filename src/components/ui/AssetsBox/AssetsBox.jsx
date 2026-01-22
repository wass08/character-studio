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
    customization,
    changeAsset,
  } = useConfiguratorStore();

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <>
      <div className="assets-box glass-card">
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

        <div className="assets-box-wrapper">
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
              key={asset.thumbnail}
            >
              <img src={pb.files.getURL(asset, asset.thumbnail)} alt="asset" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default AssetsBox;
