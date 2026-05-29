"use client";

import React from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  useConfiguratorStore,
  PHOTO_POSES,
} from "@/stores/useConfiguratorStore";
import { Tooltip } from "../primitives/Tooltip";

const PILL_SPRING = { type: "spring", stiffness: 380, damping: 32 };
const MotionButton = motion.button;

const PosesBox = () => {
  const setPose = useConfiguratorStore((state) => state.setPose);
  const pose = useConfiguratorStore((state) => state.pose);

  return (
    <div className="glass-panel no-scrollbar absolute bottom-24 left-1/2 z-30 flex max-w-[90vw] -translate-x-1/2 flex-row items-center gap-1 overflow-x-auto rounded-2xl p-1.5">
      {Object.keys(PHOTO_POSES).map((label) => {
        const value = PHOTO_POSES[label];
        const active = pose === value;
        return (
          <Tooltip key={label} label={label} side="top">
            <Button
              asChild
              variant="ghost"
              className={`relative h-auto shrink-0 rounded-xl px-5 py-2.5 text-xs font-medium tracking-tight transition-colors hover:bg-transparent ${
                active ? "text-white" : "text-white/55 hover:text-white"
              }`}
            >
              <MotionButton
                type="button"
                onClick={() => setPose(value)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={PILL_SPRING}
              >
                {active && (
                  <motion.div
                    layoutId="active-pose-pill"
                    transition={PILL_SPRING}
                    className="absolute inset-0 rounded-xl bg-white/12 ring-1 ring-white/25 shadow-[0_0_18px_rgba(255,255,255,0.12)]"
                  />
                )}
                <span className="relative">{label}</span>
              </MotionButton>
            </Button>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default PosesBox;
