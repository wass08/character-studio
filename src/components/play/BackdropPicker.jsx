"use client";

import { motion } from "motion/react";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { BACKDROP_PRESET_LIST } from "@/components/scene/backdropPresets";
import { cn } from "@/lib/utils";

const BackdropPicker = () => {
  const backdrop = useConfiguratorStore((s) => s.backdrop);
  const setBackdrop = useConfiguratorStore((s) => s.setBackdrop);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center px-4 md:top-6">
      <div
        className="glass-panel pointer-events-auto flex items-center gap-1.5 rounded-full p-1.5"
        role="radiogroup"
        aria-label="Backdrop preset"
      >
        {BACKDROP_PRESET_LIST.map((preset) => {
          const active = backdrop === preset.id;
          return (
            <motion.button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={preset.label}
              onClick={() => setBackdrop(preset.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex h-8 items-center gap-2 rounded-full pr-3 pl-1.5 text-[11px] font-medium tracking-tight transition-colors",
                active
                  ? "bg-white/20 text-white ring-1 ring-white/40"
                  : "text-white/65 hover:bg-white/10 hover:text-white",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-5 w-5 rounded-full ring-1",
                  active ? "ring-white/60" : "ring-white/20",
                )}
                style={{ background: preset.swatch }}
              />
              <span>{preset.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BackdropPicker;
