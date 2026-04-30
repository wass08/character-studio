"use client";

import { motion } from "motion/react";
import { Tooltip } from "./Tooltip";
import { cn } from "./cn";

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
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        transition={SPRING}
        aria-label={label}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white",
          className,
        )}
      >
        {children}
      </motion.button>
    </Tooltip>
  );
};
