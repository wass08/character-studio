"use client";

import { useCallback, useEffect, useState } from "react";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "@/components/ui/primitives/Toast";

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
