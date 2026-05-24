"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "./cn";
import { Tooltip } from "./Tooltip";

const SPRING = { type: "spring", stiffness: 420, damping: 26 };

// Aliased so the `motion.button` child reads as a real component in
// JSX — keeps the spring press animation under Button's asChild Slot.
const MotionButton = motion.button;

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
      <Button
        asChild
        variant="ghost"
        size="icon"
        className={cn(
          "h-10 w-10 rounded-lg text-white/75 hover:bg-white/10 hover:text-white",
          className,
        )}
      >
        <MotionButton
          type={type}
          onClick={onClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          transition={SPRING}
          aria-label={label}
        >
          {children}
        </MotionButton>
      </Button>
    </Tooltip>
  );
};
