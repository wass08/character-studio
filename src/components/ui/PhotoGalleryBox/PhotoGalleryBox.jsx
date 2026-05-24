"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "../primitives/Toast";
import { Tooltip } from "../primitives/Tooltip";

const MotionButton = motion.button;

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-3.5 w-3.5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79"
    />
  </svg>
);

const CameraIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-4 w-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-4 w-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

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
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);
  const savePhoto = useConfiguratorStore((s) => s.savePhoto);
  const capturingPhoto = useConfiguratorStore((s) => s.capturingPhoto);
  const screenshot = useConfiguratorStore((s) => s.screenshot);
  const photosChangedAt = useConfiguratorStore((s) => s.photosChangedAt);

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setPhotos([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    pb.collection("CharacterStudioPhotos")
      .getList(1, 24, { sort: "-created", skipTotal: true })
      .then((list) => {
        if (!cancelled) setPhotos(list.items);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id, photosChangedAt]);

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

  const onDelete = async (photo, e) => {
    e.stopPropagation();
    try {
      await pb.collection("CharacterStudioPhotos").delete(photo.id);
      setPhotos((list) => list.filter((p) => p.id !== photo.id));
    } catch (err) {
      toast.error(err?.message || "Failed to delete");
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
            {capturingPhoto ? <Spinner /> : <CameraIcon />}
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
              <DownloadIcon />
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
          {photos.map((p) => {
            const url = pb.files.getURL(p, p.image, { thumb: "256x256" });
            return (
              <motion.a
                key={p.id}
                href={pb.files.getURL(p, p.image)}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.04 }}
                className="group relative aspect-square overflow-hidden rounded-md border border-white/10 bg-black/30"
              >
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <Tooltip label="Delete" side="top">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={(e) => onDelete(p, e)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-md bg-black/55 text-white/70 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-500/70 hover:text-white"
                  >
                    <TrashIcon />
                  </Button>
                </Tooltip>
              </motion.a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PhotoGalleryBox;
