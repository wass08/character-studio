"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";

/**
 * Boot-time character hydration.
 *
 *   - Signed in user with no active character → auto-load their main (or
 *     the most recently-updated one) so the chrome chip is never empty.
 *   - Anonymous user with a persisted `currentCharacterId` (from a prior
 *     session in this browser) → re-fetch and load it so the wall pick
 *     survives a refresh.
 */
const AuthBootstrapper = () => {
  const pathname = usePathname();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userId = useAuthStore((s) => s.user?.id);
  const loadCharacter = useConfiguratorStore((s) => s.loadCharacter);
  const currentCharacterId = useConfiguratorStore((s) => s.currentCharacterId);
  const setCurrentCharacter = useConfiguratorStore(
    (s) => s.setCurrentCharacter,
  );

  // Tracks which user we've already auto-loaded for. Survives the
  // React-strict-mode mount/cleanup/mount cycle without cancelling the load.
  const lastLoadedForRef = useRef(null);
  const rehydratedAnonRef = useRef(false);
  // These routes own hydration themselves from their URL parameter. Global
  // bootstrapping here would race the route load with a persisted/main
  // character and make the last network response win.
  const routeOwnsCharacter =
    pathname?.startsWith("/c/") ||
    pathname?.startsWith("/editor") ||
    pathname?.startsWith("/embed") ||
    pathname?.startsWith("/claim");

  // Rehydrate a persisted character once on first mount (anonymous flow).
  useEffect(() => {
    if (routeOwnsCharacter) return;
    if (rehydratedAnonRef.current) return;
    rehydratedAnonRef.current = true;
    if (!currentCharacterId) return;
    if (Object.keys(useConfiguratorStore.getState().customization).length > 0) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rec = await pb
          .collection("CharacterStudioCharacters")
          .getOne(currentCharacterId, { requestKey: null });
        // The user may have begun a new character while this was in flight —
        // don't overwrite the fresh look with the persisted one.
        if (cancelled || useConfiguratorStore.getState().creatingNewCharacter) {
          return;
        }
        await loadCharacter(rec);
      } catch {
        // Character vanished or was hidden — clear so we don't keep retrying.
        if (!cancelled) setCurrentCharacter({ id: null, name: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    currentCharacterId,
    loadCharacter,
    routeOwnsCharacter,
    setCurrentCharacter,
  ]);

  useEffect(() => {
    if (routeOwnsCharacter) return;
    if (!isLoggedIn || !userId) {
      lastLoadedForRef.current = null;
      return;
    }
    if (lastLoadedForRef.current === userId) return;
    if (currentCharacterId) {
      lastLoadedForRef.current = userId;
      return;
    }
    // Don't auto-load the main character over a deliberately-started new one.
    if (useConfiguratorStore.getState().creatingNewCharacter) return;
    lastLoadedForRef.current = userId;
    let cancelled = false;

    (async () => {
      try {
        const mainId = pb.authStore.record?.mainCharacter;
        let record = null;
        if (mainId) {
          try {
            record = await pb
              .collection("CharacterStudioCharacters")
              .getOne(mainId, { requestKey: null });
          } catch {
            // Main was deleted or otherwise gone — fall back to latest.
          }
        }
        if (!record) {
          const list = await pb
            .collection("CharacterStudioCharacters")
            .getList(1, 1, {
              sort: "-updated",
              skipTotal: true,
              filter: `user = "${userId}"`,
            });
          record = list.items[0] || null;
        }
        // Re-check after the awaited fetch: the editor may have started a new
        // character in the meantime (child effects fire before this resolves).
        if (cancelled || useConfiguratorStore.getState().creatingNewCharacter) {
          return;
        }
        if (record) await loadCharacter(record);
      } catch {
        // Silent — auto-load is a convenience, not a guarantee.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isLoggedIn,
    userId,
    currentCharacterId,
    loadCharacter,
    routeOwnsCharacter,
  ]);

  return null;
};

export default AuthBootstrapper;
