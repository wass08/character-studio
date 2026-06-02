"use client";

import { ArrowUpRight, Pause, Play, Upload, Volume2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Scene from "@/components/scene/SceneDynamic";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/ui/LoadingScreen/LoadingScreen";
import { toast } from "@/components/ui/primitives/Toast";
import { getLipsync } from "@/lib/lipsync";
import { cn } from "@/lib/utils";
import {
  PHOTO_POSES,
  pb,
  UI_MODES,
  useConfiguratorStore,
} from "@/stores/useConfiguratorStore";
import NoCharacterOverlay from "./NoCharacterOverlay";
import PlayShell from "./PlayShell";

// Renders inside the canvas; lazy so its three / @react-three/fiber imports
// stay out of the route's first-load JS and land in the engine chunk.
const LipsyncDriver = dynamic(
  () => import("@/components/scene/LipsyncDriver"),
  { ssr: false },
);

// Maps the active character's gender onto the voice-preset filter so the
// player opens already showing the most relevant voices.
const GENDER_TO_FILTER = { man: "man", woman: "woman" };

const VOICE_FILTERS = [
  { id: "all", label: "All" },
  { id: "man", label: "Male" },
  { id: "woman", label: "Female" },
];

/**
 * /play/lipsync — pick a voice preset (admin-uploaded) or upload your own
 * audio, hit play, and watch the avatar mouth the words.
 *
 * Camera locks to the photo-mode framing so the face is centered. The actual
 * lipsync work happens in LipsyncDriver inside the canvas.
 */
const LipsyncView = () => {
  const setMode = useConfiguratorStore((s) => s.setMode);
  const setPose = useConfiguratorStore((s) => s.setPose);
  const setLipsyncPlaying = useConfiguratorStore((s) => s.setLipsyncPlaying);
  const setVisemes = useConfiguratorStore((s) => s.setVisemes);
  const introFinished = useConfiguratorStore((s) => s.introFinished);
  const gender = useConfiguratorStore((s) => s.gender);

  const [presets, setPresets] = useState([]);
  const [genderFilter, setGenderFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const visiblePresets =
    genderFilter === "all"
      ? presets
      : presets.filter((p) => p.gender === genderFilter);

  useEffect(() => {
    setMode(UI_MODES.LIPSYNC);
  }, [setMode]);

  // Swap to the talking loop while audio plays; rest on idle otherwise.
  // The playing flag also drives the camera zoom-in (CameraManager).
  useEffect(() => {
    setPose(playing ? PHOTO_POSES.Talking : PHOTO_POSES.Idle);
    setLipsyncPlaying(playing);
  }, [playing, setPose, setLipsyncPlaying]);

  // Load voice presets and prefill the gender filter from the active
  // character so the player opens on the most relevant voices. Falls back
  // to "all" when the character's gender has no matching presets.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await pb
          .collection("CharacterStudioVoicePresets")
          .getFullList({ sort: "position,created" });
        if (cancelled) return;
        setPresets(list);
        const desired = GENDER_TO_FILTER[gender] || "all";
        const hasMatch =
          desired === "all" || list.some((p) => p.gender === desired);
        setGenderFilter(hasMatch ? desired : "all");
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
      setLipsyncPlaying(false);
    };
  }, [setVisemes, setLipsyncPlaying]);

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

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-0.5">
              {VOICE_FILTERS.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setGenderFilter(opt.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-medium tracking-tight transition-colors",
                    genderFilter === opt.id
                      ? "bg-white/15 text-white ring-1 ring-white/25"
                      : "text-white/50 hover:text-white/80",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <a
              href="https://github.com/wass08/wawa-lipsync"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-[11px] tracking-tight text-white/40 transition-colors hover:text-white/75"
            >
              Powered by{" "}
              <span className="font-medium text-white/65">wawa-lipsync</span>
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>

          <div className="no-scrollbar flex max-h-40 flex-wrap content-start gap-1.5 overflow-y-auto">
            {visiblePresets.length === 0 ? (
              <div className="px-1 py-1 text-[11px] text-white/45">
                {presets.length === 0
                  ? "No voice presets yet. Admins can add some at /admin/voices."
                  : "No voices for this filter."}
              </div>
            ) : (
              visiblePresets.map((p) => {
                const url = pb.files.getURL(p, p.audio);
                const active = selected === p.label;
                return (
                  <Button
                    type="button"
                    key={p.id}
                    variant="outline"
                    onClick={() => playUrl(url, p.label)}
                    className={cn(
                      "h-9 gap-1.5 rounded-full border px-3 text-xs font-medium tracking-tight transition-colors",
                      active
                        ? "border-white/40 bg-white/15 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/75 hover:border-white/25 hover:bg-white/[0.04] hover:text-white",
                    )}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>{p.label}</span>
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
