"use client";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MotionButton = motion.button;

const HideUIButton = ({ isHidden, setIsHidden }) => {
  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "glass-panel fixed top-28 left-4 z-[1000] h-auto rounded-lg px-3.5 py-2 text-xs font-medium tracking-tight text-white",
        "hidden max-md:inline-flex",
      )}
    >
      <MotionButton
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsHidden(!isHidden)}
      >
        {isHidden ? "Show UI" : "Hide UI"}
      </MotionButton>
    </Button>
  );
};

export default HideUIButton;
