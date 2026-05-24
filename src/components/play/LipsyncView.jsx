"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Pause, Play, Upload, Volume2 } from "lucide-react";
import Scene from "@/components/scene/Scene";
import LipsyncDriver from "@/components/scene/LipsyncDriver";
import LoadingScreen from "@/components/ui/LoadingScreen/LoadingScreen";
import { Button } from "@/components/ui/button";
import PlayShell from "./PlayShell";
import NoCharacterOverlay from "./NoCharacterOverlay";
import {
  pb,
  useConfiguratorStore,
  UI_MODES,
} from "@/stores/useConfiguratorStore";
import { getLipsync } from "@/lib/lipsync";
import { toast } from "@/components/ui/primitives/Toast";
import { cn } from "@/lib/utils";

/**
 * /play/lipsync — pick a voice preset (admin-uploaded) or upload your own
 * audio, hit play, and watch the avatar mouth the words.
 *
 * Camera locks to the photo-mode framing so the face is centered. The actual
 * lipsync work happens in LipsyncDriver inside the canvas.
 */
const LipsyncView = () => {
  const setMode = useConfiguratorStore((s) => s.setMode);
  const setVisemes = useConfiguratorStore((s) => s.setVisemes);
  const introFinished = useConfiguratorStore((s) => s.introFinished);
  const gender = useConfiguratorStore((s) => s.gender);

  const [presets, setPresets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    setMode(UI_MODES.PHOTO);
  }, [setMode]);

  // Load voice presets for the active character's gender first; fall back
  // to all presets so the player isn't empty for "other" or unset gender.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await pb
          .collection("CharacterStudioVoicePresets")
          .getFullList({ sort: "position,created" });
        if (cancelled) return;
        // Sort: gender-matched first
        list.sort((a, b) => {
          const aMatch = a.gender === gender ? 0 : 1;
          const bMatch = b.gender === gender ? 0 : 1;
          return aMatch - bMatch;
        });
        setPresets(list);
      } catch (e) {
        if (!cancelled) console.warn("voice presets load failed", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [gender]);

  // Clean up audio + reset mouth on unmount.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      setVisemes(null, 0);
    };
  }, [setVisemes]);

  const playUrl = async (url, label) => {
    audioRef.current?.pause();
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.src = url;
    audio.preload = "auto";
    audio.addEventListener("ended", () => {
      setPlaying(false);
      setVisemes(null, 0);
    });
    audio.addEventListener("timeupdate", () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    });
    audioRef.current = audio;
    try {
      const m = getLipsync();
      m?.connectAudio(audio);
      await audio.play();
      setPlaying(true);
      setSelected(label);
    } catch (e) {
      toast.error(e?.message || "Couldn't start audio");
    }
  };

  const stop = () => {
    audioRef.current?.pause();
    setPlaying(false);
    setVisemes(null, 0);
  };

  const onUpload = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = URL.createObjectURL(f);
    playUrl(url, f.name);
  };

  return (
    <PlayShell title="Lipsync">
      <Scene>
        <LipsyncDriver />
      </Scene>
      {!introFinished && <LoadingScreen />}
      <NoCharacterOverlay />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-6">
        <div className="pointer-events-auto glass-panel flex w-full max-w-2xl flex-col gap-3 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="default"
              size="icon"
              onClick={() => {
                if (playing) stop();
                else if (selected) {
                  audioRef.current?.play().then(() => setPlaying(true));
                }
              }}
              disabled={!selected}
              className="h-11 w-11 rounded-full bg-white text-zinc-950 ring-1 ring-white/40 transition-transform hover:scale-105 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {playing ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              )}
            </Button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">
                {selected || "Pick a voice"}
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white/70 transition-[width] duration-150"
                  style={{ width: `${(progress * 100).toFixed(1)}%` }}
                />
              </div>
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-xs font-medium tracking-tight text-white/85 hover:border-white/30 hover:text-white">
              <Upload className="h-3.5 w-3.5" />
              <span>Upload</span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={onUpload}
              />
            </label>
          </div>

          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
            {presets.length === 0 ? (
              <div className="px-2 py-1 text-[11px] text-white/45">
                No voice presets yet. Admins can add some at /admin/voices.
              </div>
            ) : (
              presets.map((p) => {
                const url = pb.files.getURL(p, p.audio);
                const active = selected === p.label;
                return (
                  <Button
                    type="button"
                    key={p.id}
                    variant="outline"
                    onClick={() => playUrl(url, p.label)}
                    className={cn(
                      "h-9 shrink-0 gap-1.5 rounded-full border px-3 text-xs font-medium tracking-tight transition-colors",
                      active
                        ? "border-white/40 bg-white/15 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/75 hover:border-white/25 hover:bg-white/[0.04] hover:text-white",
                    )}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>{p.label}</span>
                    {p.gender && (
                      <span className="text-[10px] text-white/40">
                        {p.gender}
                      </span>
                    )}
                  </Button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PlayShell>
  );
};

export default LipsyncView;
