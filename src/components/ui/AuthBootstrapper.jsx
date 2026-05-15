"use client";

import { useEffect, useRef } from "react";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";

const AuthBootstrapper = () => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userId = useAuthStore((s) => s.user?.id);
  const loadCharacter = useConfiguratorStore((s) => s.loadCharacter);
  const currentCharacterId = useConfiguratorStore(
    (s) => s.currentCharacterId,
  );

  // Tracks which user we've already auto-loaded for. Survives the
  // React-strict-mode mount/cleanup/mount cycle without cancelling the load.
  const lastLoadedForRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn || !userId) {
      lastLoadedForRef.current = null;
      return;
    }
    if (lastLoadedForRef.current === userId) return;
    if (currentCharacterId) {
      lastLoadedForRef.current = userId;
      return;
    }
    lastLoadedForRef.current = userId;

    (async () => {
      try {
        const mainId = pb.authStore.record?.mainCharacter;
        let record = null;
        if (mainId) {
          try {
            record = await pb
              .collection("CharacterStudioCharacters")
              .getOne(mainId);
          } catch {
            // Main was deleted or otherwise gone — fall back to latest.
          }
        }
        if (!record) {
          const list = await pb
            .collection("CharacterStudioCharacters")
            .getList(1, 1, { sort: "-updated", skipTotal: true });
          record = list.items[0] || null;
        }
        if (record) await loadCharacter(record);
      } catch {
        // Silent — auto-load is a convenience, not a guarantee.
      }
    })();
  }, [isLoggedIn, userId, currentCharacterId, loadCharacter]);

  return null;
};

export default AuthBootstrapper;
