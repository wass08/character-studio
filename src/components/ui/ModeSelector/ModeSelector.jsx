"use client";

import React from "react";
import { motion } from "motion/react";
import { useConfiguratorStore, UI_MODES } from "@/stores/useConfiguratorStore";
import { cn } from "../primitives/cn";

const PILL_SPRING = { type: "spring", stiffness: 380, damping: 32 };

const MODES = [
  { id: UI_MODES.CUSTOMIZE, label: "Customize" },
  { id: UI_MODES.PHOTO, label: "Photobooth" },
];

const ModeSelector = () => {
  const mode = useConfiguratorStore((state) => state.mode);
  const setMode = useConfiguratorStore((state) => state.setMode);

  return (
    <div
      className={cn(
        "glass-panel absolute top-4 left-1/2 z-30 flex -translate-x-1/2 flex-row items-center gap-1 rounded-full p-1",
        "max-md:right-3 max-md:left-auto max-md:translate-x-0 max-md:flex-col max-md:rounded-2xl",
      )}
    >
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`relative inline-flex items-center justify-center px-4 py-1.5 text-xs font-medium tracking-tight transition-colors ${
              active ? "text-white" : "text-white/60 hover:text-white/85"
            }`}
          >
            {active && (
              <motion.div
                layoutId="active-mode-pill"
                transition={PILL_SPRING}
                className="absolute inset-0 rounded-full bg-white/15 ring-1 ring-white/25 shadow-[0_0_18px_rgba(255,255,255,0.15)] max-md:rounded-xl"
              />
            )}
            <span className="relative">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;
