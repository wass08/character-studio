"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useConfiguratorStore, pb } from "@/stores/useConfiguratorStore";
import GenderSelectionBox from "../GenderSelectionBox/GenderSelectionBox";
import { HeightSlider } from "../HeightSlider/HeightSlider";
import "./AssetsBox.css";

const AssetsBox = () => {
  const {
    sections,
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

  const [activeSectionId, setActiveSectionId] = useState(null);

  useEffect(() => {
    fetchCategories();
    resetAllMorphs();
    setHeight(1);
  }, [gender]);

  // Find the Character section object to identify it by name
  const characterSection = useMemo(
    () => sections.find((s) => s.name === "Character"),
    [sections],
  );

  const isCharacterSectionActive = activeSectionId === characterSection?.id;

  const categoriesBySection = useMemo(() => {
    const map = {};

    categories.forEach((cat) => {
      const isSkin = cat.name?.toLowerCase() === "skin";
      const hasAssets = cat.assets && cat.assets.length > 0;

      if (isSkin || hasAssets) {
        const sectionId = cat.expand?.section?.id;

        if (sectionId) {
          if (!map[sectionId]) map[sectionId] = [];
          map[sectionId].push(cat);
        } else {
          if (!map["unassigned"]) map["unassigned"] = [];
          map["unassigned"].push(cat);
        }
      }
    });

    return map;
  }, [categories]);

  useEffect(() => {
    if (!activeSectionId && currentCategory) {
      setActiveSectionId(
        currentCategory.expand?.section?.id || sections[0]?.id,
      );
    }
  }, [currentCategory, sections, activeSectionId]);

  const visibleCategories = categoriesBySection[activeSectionId] || [];
  const isCurrentCategoryVisible =
    currentCategory &&
    (currentCategory.assets?.length >= 0 ||
      currentCategory.name?.toLowerCase() === "skin");

  return (
    <>
      <div className="assets-box glass-card">
        <div className="sections-tabs">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`section-tab ${activeSectionId === section.id ? "active" : ""}`}
              onClick={() => {
                setActiveSectionId(section.id);
                const firstCat = categoriesBySection[section.id]?.[0];
                if (firstCat) setCurrentCategory(firstCat);
              }}
            >
              <div
                className="section-icon"
                style={{
                  "--icon-url": `url(${pb.files.getURL(section, section.icon)})`,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* 2. SUB-CATEGORY LIST (Visible if current section has multiple categories) */}
      <div className="categories-box-wrapper glass-card">
        <div className="categories-list">
          {visibleCategories.map((category) => (
            <button
              className={`category-button ${currentCategory?.id === category.id ? "active" : ""}`}
              key={category.id}
              onClick={() => setCurrentCategory(category)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="assets-box-wrapper glass-card">
        {loading ? (
          <div className="loading-message">Loading Assets...</div>
        ) : (
          <div className="content-container">
            {isCharacterSectionActive && (
              <div className="character-global-controls">
                <GenderSelectionBox />
                <HeightSlider />
              </div>
            )}

            {isCurrentCategoryVisible && (
              <div className="category-assets-grid">
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
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default AssetsBox;
