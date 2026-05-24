"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useConfiguratorStore, UI_MODES } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "../primitives/cn";
import { Tooltip } from "../primitives/Tooltip";

const PILL_SPRING = { type: "spring", stiffness: 380, damping: 32 };

// Modes that stay inside the editor. Photo / My-Characters moved to
// their own routes (/play/playground, /me).
const MODES = [
  { id: UI_MODES.CUSTOMIZE, label: "Customize" },
  { id: UI_MODES.EXPORT, label: "Export" },
];

const ModeSelector = () => {
  const mode = useConfiguratorStore((state) => state.mode);
  const setMode = useConfiguratorStore((state) => state.setMode);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);

  return (
    <div
      className={cn(
        "glass-panel absolute top-5 left-1/2 z-30 flex -translate-x-1/2 flex-row items-center gap-1 rounded-full p-1.5",
        "max-md:top-20 max-md:right-5 max-md:left-auto max-md:translate-x-0 max-md:rounded-2xl",
      )}
    >
      <Link
        href="/studio"
        className="inline-flex items-center px-3 py-2 text-xs font-medium tracking-tight text-white/55 transition-colors hover:text-white/90"
        aria-label="Back to studio"
      >
        ← Studio
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
            className={`relative h-auto rounded-full px-5 py-2 text-xs font-medium tracking-tight transition-colors hover:bg-transparent ${
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
                className="absolute inset-0 rounded-full bg-white/15 ring-1 ring-white/25 shadow-[0_0_18px_rgba(255,255,255,0.15)] max-md:rounded-xl"
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
