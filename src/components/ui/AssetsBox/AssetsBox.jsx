"use client";

import React from "react";
const { useConfiguratorStore, pb } = require("@/stores/useConfiguratorStore");
const { useEffect } = require("react");

import "./AssetsBox.css";

const AssetsBox = () => {
  const { categories, currentCategory, fetchCategories, setCurrentCategory } =
    useConfiguratorStore();

  console.log("Current Category State:", currentCategory);
  console.log("Assets to render:", currentCategory?.assets);

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
                console.log(category);
                setCurrentCategory(category);
              }}
            >
              {category.name}
            </button>
          );
        })}

        {currentCategory?.assets.map((asset) => (
          <button className="asset-button" key={asset.thumbnail}>
            <img src={pb.files.getURL(asset, asset.thumbnail)} alt="asset" />
          </button>
        ))}
      </div>
    </>
  );
};

export default AssetsBox;
