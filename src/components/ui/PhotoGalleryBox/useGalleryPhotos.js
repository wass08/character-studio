"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/ui/primitives/Toast";
import { useAuthStore } from "@/stores/useAuthStore";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";

export const useGalleryPhotos = () => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
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
      // requestKey: null disables PB SDK's per-method auto-cancellation,
      // which otherwise eats this request when React Strict Mode mounts
      // the effect twice in quick succession — the second call cancels
      // the first, then setPhotos never fires because we silently
      // swallowed the AbortError.
      .getList(1, 24, {
        sort: "-created",
        skipTotal: true,
        requestKey: null,
        expand: "character",
      })
      .then((list) => {
        if (!cancelled) setPhotos(list.items);
      })
      .catch((err) => {
        if (!cancelled) console.warn("[gallery] failed to load photos", err);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id, photosChangedAt]);

  const removePhoto = useCallback(async (photo) => {
    try {
      await pb.collection("CharacterStudioPhotos").delete(photo.id);
      setPhotos((list) => list.filter((p) => p.id !== photo.id));
    } catch (err) {
      toast.error(err?.message || "Failed to delete");
    }
  }, []);

  return { isLoggedIn, photos, loading, removePhoto };
};
