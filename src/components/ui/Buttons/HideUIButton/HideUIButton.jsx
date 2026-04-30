"use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "../../primitives/cn";

const HideUIButton = ({ isHidden, setIsHidden }) => {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => setIsHidden(!isHidden)}
      className={cn(
        "glass-panel fixed left-4 top-[clamp(35px,13vh,220px)] z-[1000] rounded-lg px-3.5 py-2 text-xs font-medium tracking-tight text-white",
        "hidden max-md:inline-flex",
      )}
    >
      {isHidden ? "Show UI" : "Hide UI"}
    </motion.button>
  );
};

export default HideUIButton;
