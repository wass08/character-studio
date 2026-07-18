"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { UI_MODES, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { Tooltip } from "../primitives/Tooltip";

const PILL_SPRING = { type: "spring", stiffness: 380, damping: 32 };

// Modes that stay inside the editor. Photo / My-Characters moved to
// their own routes (/c/[id]/try/photobooth, /studio).
const MODES = [
  { id: UI_MODES.CUSTOMIZE, label: "Customize" },
  { id: UI_MODES.EXPORT, label: "Export" },
];

const ModeSelector = ({ embedded = false }) => {
  const mode = useConfiguratorStore((state) => state.mode);
  const setMode = useConfiguratorStore((state) => state.setMode);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);

  return (
    <div
      className={cn(
        "z-30 flex flex-row items-center gap-1 rounded-lg p-1",
        embedded
          ? "border border-white/10 bg-white/[0.04]"
          : "glass-panel absolute top-20 right-5 p-1.5 md:top-5 md:right-auto md:left-1/2 md:-translate-x-1/2",
      )}
    >
      <Link
        href="/studio"
        className="inline-flex items-center px-2 py-2 text-xs font-medium tracking-tight text-white/55 transition-colors hover:text-white/90 md:px-3"
        aria-label="Back to My Characters"
      >
        <span className="md:hidden">←</span>
        <span className="hidden md:inline">← My Characters</span>
      </Link>
      {MODES.map((m) => {
        const active = mode === m.id;
        const disabled = m.requiresAuth && !isLoggedIn;
        const onClick = () => {
          if (disabled) {
            setLoginDialogOpen(true);
            return;
          }
          setMode(m.id);
        };
        const button = (
          <Button
            type="button"
            variant="ghost"
            onClick={onClick}
            className={`relative h-auto rounded-lg px-3 py-1.5 text-xs font-medium tracking-tight transition-colors hover:bg-transparent md:px-5 md:py-2 ${
              active
                ? "text-white"
                : disabled
                  ? "text-white/25 hover:text-white/40"
                  : "text-white/60 hover:text-white/85"
            }`}
          >
            {active && (
              <motion.div
                layoutId="active-mode-pill"
                transition={PILL_SPRING}
                className="absolute inset-0 rounded-md bg-white/15 ring-1 ring-white/25 shadow-[0_0_18px_rgba(255,255,255,0.15)]"
              />
            )}
            <span className="relative">{m.label}</span>
          </Button>
        );
        return (
          <Tooltip
            key={m.id}
            label={disabled ? "Sign in to access" : null}
            side="bottom"
          >
            {button}
          </Tooltip>
        );
      })}
    </div>
  );
};

export default ModeSelector;
