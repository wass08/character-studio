"use client";

import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/primitives/Toast";
import { Tooltip } from "@/components/ui/primitives/Tooltip";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  PHOTO_ASPECT_RATIOS,
  useConfiguratorStore,
} from "@/stores/useConfiguratorStore";

const ASPECT_IDS = Object.keys(PHOTO_ASPECT_RATIOS);

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="2.5"
    />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Bottom-centered Photo Booth control. Two states:
 *  - Closed: a single "Take a photo" CTA. The scene is clean — no
 *    overlay, no aspect-ratio chrome, just the avatar.
 *  - Open: full bar with close (X), aspect-ratio picker, Capture, and
 *    Download. The framing overlay is rendered in parallel by
 *    PhotoFramingOverlay (also gated on photoFramingOpen).
 */
const PhotoFramingBar = () => {
  const open = useConfiguratorStore((s) => s.photoFramingOpen);
  const setOpen = useConfiguratorStore((s) => s.setPhotoFramingOpen);
  const aspectId = useConfiguratorStore((s) => s.photoAspectRatio);
  const setAspect = useConfiguratorStore((s) => s.setPhotoAspectRatio);
  const savePhoto = useConfiguratorStore((s) => s.savePhoto);
  const capturingPhoto = useConfiguratorStore((s) => s.capturingPhoto);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);

  const onCapture = async () => {
    if (!isLoggedIn) {
      setLoginDialogOpen(true);
      return;
    }
    try {
      await savePhoto();
      toast.success("Photo added to gallery");
    } catch (err) {
      toast.error(err?.message || "Failed to save photo");
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        // Don't apply `glass-panel` here — its CSS `background` shorthand
        // overrides Tailwind's bg-white at runtime, producing a black-on-
        // black button. Plain white + ring + shadow gives the right CTA
        // contrast over the scene.
        className="pointer-events-auto absolute bottom-4 left-1/2 z-30 h-auto -translate-x-1/2 gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold tracking-tight text-zinc-950 shadow-[0_0_28px_rgba(255,255,255,0.18)] ring-1 ring-white/40 transition-colors hover:bg-white/90"
      >
        <Camera className="h-4 w-4" />
        <span>Take a photo</span>
      </Button>
    );
  }

  return (
    <div className="glass-panel pointer-events-auto absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl p-2 pl-2">
      <Tooltip label="Close framing" side="top">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          aria-label="Close framing"
          className="h-9 w-9 rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </Tooltip>

      <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/[0.04]">
        {ASPECT_IDS.map((id) => {
          const active = id === aspectId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setAspect(id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-tight transition-colors",
                active
                  ? "bg-white/15 text-white ring-1 ring-white/25"
                  : "text-white/55 hover:bg-white/[0.06] hover:text-white/85",
              )}
            >
              {id}
            </button>
          );
        })}
      </div>

      <div className="h-6 w-px bg-white/10" />

      <Button
        type="button"
        onClick={onCapture}
        disabled={capturingPhoto}
        className="h-auto gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold tracking-tight text-zinc-950 transition-colors hover:bg-white/90 disabled:opacity-60"
      >
        {capturingPhoto ? <Spinner /> : <Camera className="h-4 w-4" />}
        <span>Capture</span>
      </Button>
    </div>
  );
};

export default PhotoFramingBar;
