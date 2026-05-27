"use client";

import { motion } from "motion/react";
import { Camera, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "../primitives/Toast";
import { Tooltip } from "../primitives/Tooltip";
import { useGalleryPhotos } from "./useGalleryPhotos";
import GalleryThumbnail from "./GalleryThumbnail";

const MotionButton = motion.button;

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin"
    viewBox="0 0 24 24"
    fill="none"
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

const PhotoGalleryBox = () => {
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);
  const savePhoto = useConfiguratorStore((s) => s.savePhoto);
  const capturingPhoto = useConfiguratorStore((s) => s.capturingPhoto);
  const screenshot = useConfiguratorStore((s) => s.screenshot);

  const { isLoggedIn, photos, loading, removePhoto } = useGalleryPhotos();

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

  return (
    <div className="glass-panel thin-scrollbar absolute top-1/2 left-4 z-30 flex max-h-[calc(100vh-120px)] w-[clamp(180px,20vw,260px)] -translate-y-1/2 flex-col gap-2 overflow-y-auto rounded-2xl p-3 max-md:hidden">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-semibold tracking-[0.14em] text-white/65 uppercase">
          Gallery
        </h3>
        <span className="text-[10px] text-white/40">
          {isLoggedIn ? photos.length : ""}
        </span>
      </div>

      <div className="flex gap-1.5">
        <Button
          asChild
          variant="default"
          className="flex h-auto flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/25 transition-colors hover:bg-white/20 disabled:opacity-60"
        >
          <MotionButton
            type="button"
            onClick={onCapture}
            disabled={capturingPhoto}
            whileHover={{ scale: capturingPhoto ? 1 : 1.02 }}
            whileTap={{ scale: capturingPhoto ? 1 : 0.97 }}
          >
            {capturingPhoto ? <Spinner /> : <Camera className="h-4 w-4" />}
            <span>Capture</span>
          </MotionButton>
        </Button>
        <Tooltip label="Download as PNG" side="top">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/65 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
          >
            <MotionButton
              type="button"
              onClick={screenshot}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              aria-label="Download screenshot"
            >
              <Download className="h-4 w-4" />
            </MotionButton>
          </Button>
        </Tooltip>
      </div>

      {!isLoggedIn ? (
        <div className="py-4 text-center text-[11px] text-white/45">
          Sign in to save photos.
        </div>
      ) : loading && photos.length === 0 ? (
        <div className="py-4 text-center text-[11px] text-white/45">
          Loading…
        </div>
      ) : photos.length === 0 ? (
        <div className="py-4 text-center text-[11px] text-white/45">
          No photos yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((p) => (
            <GalleryThumbnail key={p.id} photo={p} onDelete={removePhoto} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoGalleryBox;
