"use client";

import { useCallback, useState } from "react";
import IdleJuice from "@/components/scene/IdleJuice";
import AssetsBox from "@/components/ui/AssetsBox/AssetsBox";
import { Button } from "@/components/ui/button";
import ColorPicker from "@/components/ui/ColorPicker/ColorPicker";
import { toast } from "@/components/ui/primitives/Toast";
import ShapeKeyControls from "@/components/ui/ShapeKeyControls/ShapeKeyControls";
import {
  EMBED_ERROR_CODES,
  EMBED_EVENTS,
  GUEST_TOKEN_HEADER,
  postToHost,
} from "@/lib/embed/contract";
import { cn } from "@/lib/utils";
import { UI_MODES, useConfiguratorStore } from "@/stores/useConfiguratorStore";

const STUDIO_URL = "https://characterstudio.wawasensei.dev";
const BAKE_WAIT_MS = 90_000;

const showColorPicker = (isSkin, currentCategory, hasAsset) =>
  !isSkin && currentCategory?.colorPalette && hasAsset;

/**
 * Poll the mutable manifest until the default bake exists. The route holds
 * each request open for the cold path (~20 s) and answers 503 + Retry-After
 * while the worker is still busy, so a handful of attempts covers a queue.
 */
async function waitForManifest(characterId) {
  const deadline = Date.now() + BAKE_WAIT_MS;
  for (;;) {
    const response = await fetch(`/api/models/c/${characterId}.json`, {
      cache: "no-store",
    });
    if (response.ok) return response.json();
    if (response.status === 429) {
      const error = new Error("Too many requests, try again in a minute");
      error.code = EMBED_ERROR_CODES.rateLimited;
      throw error;
    }
    if (response.status !== 503 || Date.now() > deadline) {
      const error = new Error(
        response.status === 503
          ? "The character took too long to prepare"
          : `Could not prepare the character (HTTP ${response.status})`,
      );
      error.code = EMBED_ERROR_CODES.bakeTimeout;
      throw error;
    }
    const retryAfter = Number(response.headers.get("Retry-After")) || 5;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(retryAfter, 15) * 1000),
    );
  }
}

/**
 * Embed chrome: "Powered by" badge, the customize panels, a Done button that
 * saves the guest character, waits for its bake and posts
 * cs.v1.character.exported, then a claim panel to move it into an account.
 */
export default function EmbedUI({ session }) {
  const customization = useConfiguratorStore((s) => s.customization);
  const currentCategory = useConfiguratorStore((s) => s.currentCategory);
  const detectedMorphsByCategory = useConfiguratorStore(
    (s) => s.detectedMorphsByCategory,
  );
  const mode = useConfiguratorStore((s) => s.mode);
  const loading = useConfiguratorStore((s) => s.loading);
  const saving = useConfiguratorStore((s) => s.saving);
  const saveCharacter = useConfiguratorStore((s) => s.saveCharacter);
  const currentCharacterId = useConfiguratorStore((s) => s.currentCharacterId);
  const currentCharacterName = useConfiguratorStore(
    (s) => s.currentCharacterName,
  );

  const [phase, setPhase] = useState("editing"); // editing | saving | baking | done
  const [exported, setExported] = useState(null);
  const [claim, setClaim] = useState(null); // { claimUrl, code, expiresAt }
  const [claiming, setClaiming] = useState(false);

  const uniqueMorphs = [
    ...new Set(Object.values(detectedMorphsByCategory).flat()),
  ];
  const isSkinCategory = currentCategory?.name === "Skin";
  const hasAsset = customization[currentCategory?.name]?.asset;

  const reportError = useCallback(
    (error) => {
      const code = error?.code || EMBED_ERROR_CODES.saveFailed;
      const message = error?.message || "Something went wrong";
      postToHost(session.hostOrigin, {
        type: EMBED_EVENTS.error,
        code,
        message,
      });
      toast.error(message);
    },
    [session.hostOrigin],
  );

  const onDone = async () => {
    if (phase !== "editing" || loading || saving) return;
    try {
      setPhase("saving");
      const name = (currentCharacterName || "").trim() || "My character";
      const record = await saveCharacter({ name });
      setPhase("baking");
      const manifest = await waitForManifest(record.id);
      // The mutable URL must follow THIS character even when its bake record
      // is shared with an identical recipe baked earlier.
      const origin = new URL(manifest.urls.manifest).origin;
      const payload = {
        type: EMBED_EVENTS.exported,
        characterId: record.id,
        bakeId: manifest.bakeId,
        name: record.name || manifest.name,
        gender: manifest.gender,
        glbUrl: manifest.urls.model,
        characterUrl: `${origin}/api/models/c/${record.id}.glb`,
        animationsUrl: manifest.urls.animations,
        manifestUrl: manifest.urls.manifest,
      };
      postToHost(session.hostOrigin, payload);
      setExported(payload);
      setClaim(null);
      setPhase("done");
    } catch (error) {
      setPhase("editing");
      reportError(error);
    }
  };

  const onClaim = async () => {
    if (!currentCharacterId || claiming) return;
    setClaiming(true);
    try {
      const response = await fetch(
        `/api/embed/characters/${currentCharacterId}/claim-code`,
        {
          method: "POST",
          headers: { [GUEST_TOKEN_HEADER]: session.guestToken },
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Couldn't start the claim");
      }
      setClaim(payload);
      // First-party tab: the host page's storage partition can't carry a
      // Character Studio session, so the sign-in happens over there.
      window.open(payload.claimUrl, "_blank", "noopener");
    } catch (error) {
      toast.error(error?.message || "Couldn't start the claim");
    } finally {
      setClaiming(false);
    }
  };

  const busy = phase === "saving" || phase === "baking";
  const doneLabel =
    phase === "saving" ? "Saving…" : phase === "baking" ? "Preparing…" : "Done";

  return (
    <>
      <header className="app-topbar absolute inset-x-0 top-0 z-40 flex min-h-15 items-center gap-3 px-4 py-2.5 md:px-6">
        <a
          href={STUDIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 select-none items-center gap-2 text-[11px] font-medium tracking-wide text-white/60 transition-colors hover:text-white"
          aria-label="Powered by Character Studio"
        >
          <span className="hidden sm:inline">Powered by</span>
          <img
            src="/images/logo-white.svg"
            alt="Character Studio"
            className="h-6 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
          />
        </a>

        <div className="ml-auto flex items-center gap-2">
          {phase === "done" ? (
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-lg px-3 text-xs text-white/70 hover:text-white"
              onClick={() => setPhase("editing")}
            >
              Keep editing
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={onDone}
            disabled={busy || loading || phase === "done"}
            className="h-9 rounded-lg px-4 text-sm font-semibold"
            aria-label="Done, export this character"
          >
            {doneLabel}
          </Button>
        </div>
      </header>

      {mode === UI_MODES.CUSTOMIZE && phase !== "done" && <IdleJuice />}

      {mode === UI_MODES.CUSTOMIZE && phase !== "done" && (
        <div>
          {(showColorPicker(isSkinCategory, currentCategory, hasAsset) ||
            uniqueMorphs.length > 0) && (
            <div
              className={cn(
                "absolute right-[clamp(20px,3.5vw,256px)] top-1/2 z-30 flex w-[clamp(300px,28vw,380px)] max-h-[calc(100vh-120px)] -translate-y-1/2 flex-col gap-3",
                "max-md:fixed max-md:top-auto max-md:bottom-[calc(50vh+8px)] max-md:left-2 max-md:right-2 max-md:w-auto max-md:max-h-[55vh] max-md:translate-y-0",
              )}
            >
              {showColorPicker(isSkinCategory, currentCategory, hasAsset) && (
                <ColorPicker />
              )}
              {uniqueMorphs.length > 0 && <ShapeKeyControls />}
            </div>
          )}
          <AssetsBox />
        </div>
      )}

      {busy && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex justify-center">
          <div className="glass-panel rounded-full px-4 py-2 text-xs text-white/80">
            {phase === "saving"
              ? "Saving your character…"
              : "Preparing your character, this takes about ten seconds…"}
          </div>
        </div>
      )}

      {phase === "done" && exported && (
        <aside className="absolute left-4 top-20 z-40 w-[min(360px,calc(100vw-32px))] md:left-6">
          <div className="glass-panel rounded-2xl p-5">
            <div className="text-[10px] font-semibold tracking-[0.18em] text-white/45 uppercase">
              Ready
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              {exported.name}
            </h2>
            <p className="mt-2 text-sm text-white/65">
              Your character was handed to this page. Save it to a Character
              Studio account to edit it later, use it in other apps, or share
              it.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="button"
                onClick={onClaim}
                disabled={claiming}
                className="h-10 rounded-lg text-sm font-semibold"
              >
                {claiming ? "Opening…" : "Save to Character Studio"}
              </Button>
              {claim ? (
                <p className="text-xs text-white/55">
                  A sign-in tab opened. If it was blocked,{" "}
                  <a
                    href={claim.claimUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline underline-offset-2"
                  >
                    open it here
                  </a>{" "}
                  (code <span className="font-mono">{claim.code}</span>, valid{" "}
                  {Math.round(claim.ttlSeconds / 60)} minutes).
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
