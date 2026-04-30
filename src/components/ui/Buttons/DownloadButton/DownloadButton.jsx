"use client";
import React from "react";

import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { IconButton } from "../../primitives/IconButton";

const DownloadButton = () => {
  const download = useConfiguratorStore((state) => state.download);

  return (
    <div className="absolute right-[clamp(20px,4vw,53px)] top-[clamp(14px,5vh,48px)] z-30">
      <IconButton onClick={download} label="Download GLB" side="bottom">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
      </IconButton>
    </div>
  );
};

export default DownloadButton;
