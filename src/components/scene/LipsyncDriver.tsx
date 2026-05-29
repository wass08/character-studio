"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { getLipsync } from "@/lib/lipsync";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";

/**
 * Lives inside <Canvas>. Polls the singleton Lipsync each frame and pushes
 * the active viseme onto the avatar's morph targets through `setVisemes`.
 *
 * The component is always mounted on the lipsync route; off-route routes
 * just don't mount it, so this never runs unnecessarily.
 */
const LipsyncDriver = () => {
  const setVisemes = useConfiguratorStore(
    (s: { setVisemes: (key: string | null, weight: number) => void }) =>
      s.setVisemes,
  );
  const lastViseme = useRef<string | null>(null);

  useFrame(() => {
    const m = getLipsync();
    if (!m) return;
    m.processAudio();
    const viseme = m.viseme as string | null;
    if (viseme !== lastViseme.current) {
      lastViseme.current = viseme;
      // Only push lipsync visemes — never the resting "viseme_sil" with a 1.0
      // intensity, otherwise the mouth pinches shut between phonemes.
      setVisemes(viseme && viseme !== "viseme_sil" ? viseme : null, 1);
    }
  });

  return null;
};

export default LipsyncDriver;
