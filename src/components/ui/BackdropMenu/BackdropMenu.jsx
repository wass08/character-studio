"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  BACKDROP_PRESET_LIST,
  BACKDROP_PRESETS,
  DEFAULT_BACKDROP,
} from "@/components/scene/backdropPresets";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";

/**
 * Backdrop preset switcher for the studio topbars (editor + photo booth +
 * lipsync). Lives in the chrome so the environment is never something you can
 * only change from one specific route.
 */
const BackdropMenu = () => {
  const backdrop = useConfiguratorStore((s) => s.backdrop);
  const setBackdrop = useConfiguratorStore((s) => s.setBackdrop);
  const active =
    BACKDROP_PRESETS[backdrop] ?? BACKDROP_PRESETS[DEFAULT_BACKDROP];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Backdrop: ${active.label}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 text-xs font-medium tracking-tight text-white/80 backdrop-blur transition-colors hover:border-white/25 hover:text-white"
        >
          <span
            aria-hidden
            className="h-4 w-4 rounded-full ring-1 ring-white/25"
            style={{ background: active.swatch }}
          />
          <span className="max-md:hidden">{active.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-white/50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[10rem] border-white/10 bg-zinc-950/90 text-white shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        {BACKDROP_PRESET_LIST.map((preset) => {
          const selected = preset.id === backdrop;
          return (
            <DropdownMenuItem
              key={preset.id}
              onSelect={() => setBackdrop(preset.id)}
              className={cn(
                "gap-2.5 text-xs font-medium tracking-tight text-white/80 focus:bg-white/10 focus:text-white",
                selected && "text-white",
              )}
            >
              <span
                aria-hidden
                className="h-4.5 w-4.5 rounded-full ring-1 ring-white/25"
                style={{ background: preset.swatch }}
              />
              <span className="flex-1">{preset.label}</span>
              {selected && <Check className="h-3.5 w-3.5 text-white" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BackdropMenu;
