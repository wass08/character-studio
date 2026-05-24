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
        // Mobile-first layout: pill anchored top-right under the
        // TopActions row. Tailwind v4 doesn't always let `max-md:`
        // overrides win against base positioning utilities when both
        // `left` and `right` get set, so the desktop layout overrides
        // via `md:` instead. See wiki/architecture/app-structure.md
        // ## Responsive conventions for the rule.
        "glass-panel absolute top-20 right-5 z-30 flex flex-row items-center gap-1 rounded-2xl p-1.5",
        "md:top-5 md:right-auto md:left-1/2 md:-translate-x-1/2 md:rounded-full",
      )}
    >
      <Link
        href="/studio"
        className="inline-flex items-center px-2 py-2 text-xs font-medium tracking-tight text-white/55 transition-colors hover:text-white/90 md:px-3"
        aria-label="Back to studio"
      >
        <span className="md:hidden">←</span>
        <span className="hidden md:inline">← Studio</span>
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
            className={`relative h-auto rounded-full px-3 py-1.5 text-xs font-medium tracking-tight transition-colors hover:bg-transparent md:px-5 md:py-2 ${
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
                className="absolute inset-0 rounded-xl bg-white/15 ring-1 ring-white/25 shadow-[0_0_18px_rgba(255,255,255,0.15)] md:rounded-full"
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
