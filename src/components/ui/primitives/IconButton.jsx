"use client";

import { motion } from "motion/react";
import { Tooltip } from "./Tooltip";

const SPRING = { type: "spring", stiffness: 420, damping: 26 };

export const IconButton = ({
  label,
  onClick,
  children,
  className = "",
  side = "bottom",
  type = "button",
}) => {
  return (
    <Tooltip label={label} side={side}>
      <motion.button
        type={type}
        onClick={onClick}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        transition={SPRING}
        className={`glass-panel inline-flex h-10 w-10 items-center justify-center rounded-lg text-panel-fg transition-colors hover:bg-white/10 ${className}`}
        aria-label={label}
      >
        {children}
      </motion.button>
    </Tooltip>
  );
};
