"use client";

import { Camera, Images } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/useAuthStore";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { toast } from "../primitives/Toast";
import GalleryThumbnail from "./GalleryThumbnail";
import { useGalleryPhotos } from "./useGalleryPhotos";

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

const PhotoGallerySheet = () => {
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);
  const savePhoto = useConfiguratorStore((s) => s.savePhoto);
  const capturingPhoto = useConfiguratorStore((s) => s.capturingPhoto);
  const photosChangedAt = useConfiguratorStore((s) => s.photosChangedAt);
  const { isLoggedIn, photos, loading, removePhoto } = useGalleryPhotos();

  const [open, setOpen] = useState(false);

  // Close the sheet after a fresh capture so the new thumbnail flashes on
  // the canvas, not behind the sheet.
  const lastChangeRef = useRef(photosChangedAt);
  useEffect(() => {
    if (!open) {
      lastChangeRef.current = photosChangedAt;
      return;
    }
    if (photosChangedAt !== lastChangeRef.current) {
      lastChangeRef.current = photosChangedAt;
      const t = setTimeout(() => setOpen(false), 400);
      return () => clearTimeout(t);
    }
  }, [photosChangedAt, open]);

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

  const count = isLoggedIn ? photos.length : 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <motion.button
          type="button"
          aria-label="Open gallery"
          whileTap={{ scale: 0.94 }}
          className="glass-panel absolute right-4 bottom-24 z-30 flex h-12 items-center gap-2 rounded-lg px-4 text-xs font-medium text-white ring-1 ring-white/25 md:hidden"
        >
          <Images className="h-4 w-4" />
          <span>Gallery</span>
          {count > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {count}
            </span>
          )}
        </motion.button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[70dvh] rounded-t-2xl border-white/10 bg-zinc-950/95 text-white backdrop-blur-md"
      >
        <SheetHeader className="border-b border-white/10">
          <SheetTitle className="text-white">Gallery</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-4">
          <Button
            type="button"
            onClick={onCapture}
            disabled={capturingPhoto}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white/15 px-3 text-sm font-medium text-white ring-1 ring-white/25 hover:bg-white/20 disabled:opacity-60"
          >
            {capturingPhoto ? <Spinner /> : <Camera className="h-4 w-4" />}
            <span>Capture</span>
          </Button>

          <div className="thin-scrollbar -mr-2 flex-1 overflow-y-auto pr-2">
            {!isLoggedIn ? (
              <div className="py-6 text-center text-xs text-white/50">
                Sign in to save photos.
              </div>
            ) : loading && photos.length === 0 ? (
              <div className="py-6 text-center text-xs text-white/50">
                Loading…
              </div>
            ) : photos.length === 0 ? (
              <div className="py-6 text-center text-xs text-white/50">
                No photos yet. Snap one with Capture.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p) => (
                  <GalleryThumbnail
                    key={p.id}
                    photo={p}
                    onDelete={removePhoto}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PhotoGallerySheet;
