"use client";

import React from "react";
import {
  useConfiguratorStore,
  PHOTO_POSES,
} from "@/stores/useConfiguratorStore";

import "./PosesBox.css";

const PosesBox = () => {
  const setPose = useConfiguratorStore((state) => state.setPose);

  return (
    <>
      <div className="poses-box">
        {Object.keys(PHOTO_POSES).map((pose, index) => (
          <button
            key={index}
            onClick={() => setPose(PHOTO_POSES[pose])}
            className="pose-button"
          >
            {pose}
          </button>
        ))}
      </div>
    </>
  );
};

export default PosesBox;
