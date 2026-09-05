"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Scene from "@/components/scene/SceneDynamic";
import { randomCharacterName } from "@/lib/characterNames";
import {
  createGuestToken,
  EMBED_CONTRACT_VERSION,
  EMBED_EVENTS,
  EMBED_GENDERS,
  GUEST_TOKEN_STORAGE_KEY,
  postToHost,
  resolveHostOrigin,
} from "@/lib/embed/contract";
import { UI_MODES, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import EmbedUI from "./EmbedUI";

// The guest token lives in sessionStorage so a reload inside the same host
// page keeps ownership of the draft. Browsers partition that storage per
// embedding site, which is exactly the scope we want.
function loadGuestToken() {
  try {
    const existing = window.sessionStorage.getItem(GUEST_TOKEN_STORAGE_KEY);
    if (existing) return existing;
  } catch {
    // Storage blocked (private mode, third-party restrictions): a per-load
    // token still works, the draft just won't survive a reload.
  }
  const token = createGuestToken();
  try {
    window.sessionStorage.setItem(GUEST_TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore
  }
  return token;
}

/**
 * /embed — the creator in host-page chrome. Boots a guest session, resets to
 * a fresh character (optionally seeded by ?gender=), posts cs.v1.ready once
 * the catalog is in, and hands the rest to EmbedUI.
 */
export default function EmbedView() {
  const params = useSearchParams();
  const hostOrigin = resolveHostOrigin(params.get("origin"));
  const genderParam = params.get("gender");

  const setEmbedSession = useConfiguratorStore((s) => s.setEmbedSession);
  const beginNewCharacter = useConfiguratorStore((s) => s.beginNewCharacter);
  const setCurrentCharacter = useConfiguratorStore(
    (s) => s.setCurrentCharacter,
  );
  const setGender = useConfiguratorStore((s) => s.setGender);
  const setMode = useConfiguratorStore((s) => s.setMode);
  const loading = useConfiguratorStore((s) => s.loading);

  const [session, setSession] = useState(null);
  const readySent = useRef(false);

  useEffect(() => {
    const next = { hostOrigin, guestToken: loadGuestToken() };
    setEmbedSession(next);
    setSession(next);
    setMode(UI_MODES.CUSTOMIZE);
    if (EMBED_GENDERS.includes(genderParam)) setGender(genderParam);
    // Always start from a clean draft: the embed never resumes a persisted
    // first-party character. Seed a playful name so the visitor can just
    // press Done.
    beginNewCharacter().then(() =>
      setCurrentCharacter({ id: null, name: randomCharacterName() }),
    );
    return () => setEmbedSession(null);
  }, [
    hostOrigin,
    genderParam,
    setEmbedSession,
    setMode,
    setGender,
    beginNewCharacter,
    setCurrentCharacter,
  ]);

  // cs.v1.ready fires once the first catalog load finished and the creator
  // is interactive. Hosts use it to hide their own placeholder.
  useEffect(() => {
    if (!session || loading || readySent.current) return;
    readySent.current = true;
    postToHost(session.hostOrigin, {
      type: EMBED_EVENTS.ready,
      version: EMBED_CONTRACT_VERSION,
    });
  }, [session, loading]);

  return (
    <main className="fixed inset-0 flex h-screen w-full flex-col bg-black text-white">
      <Scene />
      {session && <EmbedUI session={session} />}
    </main>
  );
}
