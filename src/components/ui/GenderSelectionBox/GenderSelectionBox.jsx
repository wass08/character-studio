"use client";

import React from "react";
import { useConfiguratorStore, GENDERS } from "@/stores/useConfiguratorStore";

import "./GenderSelectionBox.css";

const GenderSelectionBox = () => {
  const gender = useConfiguratorStore((state) => state.gender);
  const setGender = useConfiguratorStore((state) => state.setGender);

  return (
    <>
      <div className="gender-selection-box">
        <div className="gender-selection-box-wrapper">
          <button
            className={`gender-button  glass-card ${gender === GENDERS.MAN ? "active" : ""}`}
            onClick={() => setGender(GENDERS.MAN)}
          >
            Man
          </button>
          <button
            className={`gender-button  glass-card ${gender === GENDERS.WOMAN ? "active" : ""}`}
            onClick={() => setGender(GENDERS.WOMAN)}
          >
            woman
          </button>
        </div>
      </div>
    </>
  );
};

export default GenderSelectionBox;
