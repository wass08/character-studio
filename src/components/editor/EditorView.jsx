"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Scene from "@/components/scene/Scene";
import UI from "@/components/ui/UI";
import {
  pb,
  useConfiguratorStore,
  UI_MODES,
} from "@/stores/useConfiguratorStore";
import { toast } from "@/components/ui/primitives/Toast";

/**
 * Hosts the existing studio canvas + side panels for the /create routes.
 *
 *   - /create        → fresh character (clears current id on mount)
 *   - /create/:id    → loads the character on mount
 *
 * On successful save we redirect to /c/:id so the user sees the new profile.
 * (The redirect is wired by subscribing to `currentCharacterId` and bumping
 * it after save — see useConfiguratorStore.saveCharacter.)
 */
const EditorView = ({ characterId }) => {
  const router = useRouter();
  const loadCharacter = useConfiguratorStore((s) => s.loadCharacter);
  const setCurrentCharacter = useConfiguratorStore(
    (s) => s.setCurrentCharacter,
  );
  const setMode = useConfiguratorStore((s) => s.setMode);
  const charactersChangedAt = useConfiguratorStore(
    (s) => s.charactersChangedAt,
  );
  const currentCharacterId = useConfiguratorStore((s) => s.currentCharacterId);
  const loadedFor = useRef(null);

  useEffect(() => {
    setMode(UI_MODES.CUSTOMIZE);
  }, [setMode]);

  // Sync the active character with the URL.
  useEffect(() => {
    if (!characterId) {
      if (loadedFor.current !== null) {
        // Switching from /create/:id back to /create — start fresh.
        setCurrentCharacter({ id: null, name: null });
        loadedFor.current = null;
      }
      return;
    }
    if (loadedFor.current === characterId) return;
    loadedFor.current = characterId;
    (async () => {
      try {
        const rec = await pb
          .collection("CharacterStudioCharacters")
          .getOne(characterId, { requestKey: null });
        await loadCharacter(rec);
      } catch (e) {
        toast.error(e?.message || "Couldn't load character");
        router.replace("/create");
      }
    })();
  }, [characterId, loadCharacter, setCurrentCharacter, router]);

  // After save, redirect to the profile.
  const lastBumpRef = useRef(0);
  useEffect(() => {
    if (!charactersChangedAt) return;
    if (lastBumpRef.current === 0) {
      lastBumpRef.current = charactersChangedAt;
      return;
    }
    if (charactersChangedAt !== lastBumpRef.current && currentCharacterId) {
      lastBumpRef.current = charactersChangedAt;
      router.push(`/c/${currentCharacterId}`);
    }
  }, [charactersChangedAt, currentCharacterId, router]);

  return (
    <main className="fixed inset-0 flex h-screen w-full flex-col bg-black">
      <Scene />
      <UI />
    </main>
  );
};

export default EditorView;
