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
      <div className="poses-box glass-card">
        {Object.keys(PHOTO_POSES).map((pose, index) => (
          <button
            key={index}
            onClick={() => setPose(PHOTO_POSES[pose])}
            className="pose-button"
          >
            {pose}
            {/* <img src={pb.files.getURL(pose, pose.thumbnail)} alt="thumbnail" /> */}
          </button>
        ))}
      </div>
    </>
  );
};

export default PosesBox;
