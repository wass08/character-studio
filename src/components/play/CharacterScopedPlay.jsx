"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/primitives/Spinner";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";

/**
 * Wraps a per-character experiment view at /c/[id]/try/[experiment].
 *
 * Ensures the character at the URL is the one in the configurator
 * store before rendering the play view — otherwise the editor's
 * `<Avatar />` would mount with whatever happened to be in the store
 * (the previous visitor's character, the demo from HeroStage, etc.).
 *
 * If the character is already loaded (e.g. navigated here from
 * `/c/[id]`), this is a no-op — the children render immediately.
 */
const CharacterScopedPlay = ({ characterId, children }) => {
  const loadCharacter = useConfiguratorStore((s) => s.loadCharacter);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!characterId) return undefined;
    setReady(false);
    setError(false);

    // currentCharacterId survives reloads (it's persisted) but the heavy
    // state — customization, morphs, height, categories — does not. So an
    // id match alone doesn't mean the avatar is actually dressed; only skip
    // the fetch when the character is genuinely in memory.
    const state = useConfiguratorStore.getState();
    if (
      state.currentCharacterId === characterId &&
      Object.keys(state.customization).length > 0
    ) {
      setReady(true);
      return undefined;
    }

    let cancelled = false;
    pb.collection("CharacterStudioCharacters")
      .getOne(characterId, { requestKey: null })
      .then((rec) => (cancelled ? null : loadCharacter(rec)))
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [characterId, loadCharacter]);

  if (error) {
    return (
      <main className="fixed inset-0 flex h-screen w-full items-center justify-center bg-black px-6 text-white">
        <div className="max-w-md rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-8 text-center text-sm text-white/70">
          <p className="font-medium text-white">Character not found</p>
          <p className="mt-1 text-xs text-white/55">
            It might be hidden or the link could be stale.
          </p>
          <Link
            href="/studio"
            className="mt-5 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium tracking-tight text-white/85 transition-colors hover:border-white/35 hover:text-white"
          >
            Back to Studio
          </Link>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="fixed inset-0 flex h-screen w-full items-center justify-center bg-black text-white">
        <Spinner className="h-8 w-8" />
      </main>
    );
  }

  return children;
};

export default CharacterScopedPlay;
