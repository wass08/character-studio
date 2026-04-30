"use client";

import React from "react";
import { motion } from "motion/react";
import { useConfiguratorStore, GENDERS } from "@/stores/useConfiguratorStore";

const PILL_SPRING = { type: "spring", stiffness: 380, damping: 32 };

const OPTIONS = [
  { id: GENDERS.MAN, label: "Man" },
  { id: GENDERS.WOMAN, label: "Woman" },
];

const GenderSelectionBox = () => {
  const gender = useConfiguratorStore((state) => state.gender);
  const setGender = useConfiguratorStore((state) => state.setGender);

  return (
    <div className="relative flex w-full shrink-0 flex-row items-stretch gap-1 rounded-lg bg-black/15 p-1 ring-1 ring-white/[0.04] max-md:w-[180px] md:w-full">
      {OPTIONS.map((opt) => {
        const active = gender === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setGender(opt.id)}
            className={`relative flex flex-1 items-center justify-center rounded-md px-4 py-2 text-xs font-medium tracking-tight transition-colors ${
              active ? "text-white" : "text-white/55 hover:text-white/85"
            }`}
          >
            {active && (
              <motion.div
                layoutId="active-gender-pill"
                transition={PILL_SPRING}
                className="absolute inset-0 rounded-md bg-white/12 ring-1 ring-white/25 shadow-[0_0_16px_rgba(255,255,255,0.12)]"
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default GenderSelectionBox;
