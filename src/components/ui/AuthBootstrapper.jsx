"use client";

import { useEffect, useRef } from "react";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";

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
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userId = useAuthStore((s) => s.user?.id);
  const loadCharacter = useConfiguratorStore((s) => s.loadCharacter);
  const currentCharacterId = useConfiguratorStore(
    (s) => s.currentCharacterId,
  );
  const setCurrentCharacter = useConfiguratorStore(
    (s) => s.setCurrentCharacter,
  );

  // Tracks which user we've already auto-loaded for. Survives the
  // React-strict-mode mount/cleanup/mount cycle without cancelling the load.
  const lastLoadedForRef = useRef(null);
  const rehydratedAnonRef = useRef(false);

  // Rehydrate a persisted character once on first mount (anonymous flow).
  useEffect(() => {
    if (rehydratedAnonRef.current) return;
    rehydratedAnonRef.current = true;
    if (!currentCharacterId) return;
    (async () => {
      try {
        const rec = await pb
          .collection("CharacterStudioCharacters")
          .getOne(currentCharacterId, { requestKey: null });
        // The user may have begun a new character while this was in flight —
        // don't overwrite the fresh look with the persisted one.
        if (useConfiguratorStore.getState().creatingNewCharacter) return;
        await loadCharacter(rec);
      } catch {
        // Character vanished or was hidden — clear so we don't keep retrying.
        setCurrentCharacter({ id: null, name: null });
      }
    })();
  }, [currentCharacterId, loadCharacter, setCurrentCharacter]);

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
    // Don't auto-load the main character over a deliberately-started new one.
    if (useConfiguratorStore.getState().creatingNewCharacter) return;
    lastLoadedForRef.current = userId;

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
        if (useConfiguratorStore.getState().creatingNewCharacter) return;
        if (record) await loadCharacter(record);
      } catch {
        // Silent — auto-load is a convenience, not a guarantee.
      }
    })();
  }, [isLoggedIn, userId, currentCharacterId, loadCharacter]);

  return null;
};

export default AuthBootstrapper;
