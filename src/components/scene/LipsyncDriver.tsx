"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Object3D, SkinnedMesh } from "three";
import { MathUtils } from "three";
import { VISEMES } from "wawa-lipsync";
import { getLipsync } from "@/lib/lipsync";

const { lerp, randInt } = MathUtils;
const VISEME_KEYS = Object.values(VISEMES) as string[];

const isSkinnedMesh = (o: Object3D): o is SkinnedMesh =>
  (o as SkinnedMesh).isSkinnedMesh === true;

/**
 * Lives inside <Canvas>. Each frame it polls the singleton Lipsync for the
 * active viseme and eases the avatar's face toward it, while running an
 * idle blink loop. Morph influences are lerped (not snapped) so the mouth
 * and eyelids move smoothly between phonemes.
 *
 * Visemes/blink are written straight onto the skinned meshes here rather
 * than through the store: they're per-frame ephemerals that must never
 * mark the character dirty or fight the static face-customization morphs
 * that Asset.tsx applies from `morphValues`.
 */
const LipsyncDriver = () => {
  const scene = useThree((s) => s.scene);
  const blink = useRef(false);

  // Random blink loop: open for 1.5–5s, shut for ~120ms.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let close: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(
        () => {
          blink.current = true;
          close = setTimeout(() => {
            blink.current = false;
            schedule();
          }, 120);
        },
        randInt(1500, 5000),
      );
    };
    schedule();
    return () => {
      clearTimeout(timeout);
      clearTimeout(close);
    };
  }, []);

  useFrame(() => {
    const m = getLipsync();
    if (m) m.processAudio();
    const currentViseme = m ? (m.viseme as string) : null;
    const blinkTarget = blink.current ? 1 : 0;

    scene.traverse((obj) => {
      if (!isSkinnedMesh(obj)) return;
      const dict = obj.morphTargetDictionary;
      const infl = obj.morphTargetInfluences;
      if (!dict || !infl) return;

      const bl = dict.eyeBlinkLeft;
      if (bl !== undefined) infl[bl] = lerp(infl[bl], blinkTarget, 0.4);
      const br = dict.eyeBlinkRight;
      if (br !== undefined) infl[br] = lerp(infl[br], blinkTarget, 0.4);

      if (currentViseme === null) return;
      for (let i = 0; i < VISEME_KEYS.length; i++) {
        const key = VISEME_KEYS[i];
        const idx = dict[key];
        if (idx === undefined) continue;
        // Never raise the resting "viseme_sil", or the mouth pinches shut.
        const target = key !== "viseme_sil" && key === currentViseme ? 1 : 0;
        infl[idx] = lerp(infl[idx], target, 0.25);
      }
    });
  });

  return null;
};

export default LipsyncDriver;
