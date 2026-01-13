"use client";

import React from "react";
const { useConfiguratorStore } = require("@/stores/useConfiguratorStore");
const { useEffect } = require("react");

import "./AssetsBox.css";

const AssetsBox = () => {
  const { categories, currentCategory, fetchCategories, setCurrentCategory } =
    useConfiguratorStore();

  useEffect(() => {
    fetchCategories();

    console.log(categories);
  }, []);

  return (
    <>
      <div className="assets-box">
        {categories.map((category) => {
          return (
            <button key={category.id} onClick={() => setCurrentCategory}>
              {category.name}
            </button>
          );
        })}
      </div>
    </>
  );
};

export default AssetsBox;
