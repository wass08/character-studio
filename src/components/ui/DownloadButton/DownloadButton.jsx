"use client";
import React from "react";

import "./DownloadButton.css";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";

const DownloadButton = () => {
  const download = useConfiguratorStore((state) => state.download);

  return (
    <>
      <button onClick={download} className="download-button">
        download
      </button>
    </>
  );
};

export default DownloadButton;
