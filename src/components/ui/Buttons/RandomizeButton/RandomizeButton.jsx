"use client";
import React from "react";

import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { IconButton } from "../../primitives/IconButton";

const RandomizeButton = () => {
  const randomize = useConfiguratorStore((state) => state.randomize);

  return (
    <div className="absolute right-[clamp(80px,9vw,124px)] top-[clamp(14px,5vh,48px)] z-30">
      <IconButton onClick={randomize} label="Randomize" side="bottom">
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
            d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3"
          />
        </svg>
      </IconButton>
    </div>
  );
};

export default RandomizeButton;
