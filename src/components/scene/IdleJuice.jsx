"use client";

import { useEffect, useRef } from "react";
import { PHOTO_POSES, useConfiguratorStore } from "@/stores/useConfiguratorStore";

// Gentle personality breaks the avatar plays while standing idle. All three
// are looping clips that read fine when held for a few seconds and then
// crossfaded back to the idle pose (there's no dedicated "wave" clip).
const GESTURES = [
  PHOTO_POSES.Talking, // Rig|Idle_Talking_Loop
  PHOTO_POSES.Dance, // Rig|Dance_Loop
  PHOTO_POSES.Spell, // Rig|Spell_Simple_Idle_Loop
];

const FIRST_DELAY = [6000, 10000]; // ms before the first gesture after mount
const REST_GAP = [11000, 19000]; // ms of plain idle between gestures
const HOLD = [3500, 6000]; // ms a gesture is held before returning to idle

const rand = ([min, max]) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Ambient "juice": occasionally plays a subtle gesture on the idle avatar,
 * then returns to idle. Mount it only where idle juice is wanted (home +
 * editor) — it drives the shared store, so every Avatar reflects it.
 *
 * Self-gates to the resting Idle pose so it never interrupts a chosen pose,
 * lipsync, or photo framing, pauses while the tab is hidden, and honors
 * prefers-reduced-motion. Clears the gesture on unmount so it can't leak
 * onto another route.
 */
const IdleJuice = () => {
  const setGesture = useConfiguratorStore((s) => s.setGesture);
  const timerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      return;
    }

    let cancelled = false;

    const scheduleNext = (delay) => {
      timerRef.current = setTimeout(tick, delay);
    };

    const tick = () => {
      if (cancelled) return;
      const pose = useConfiguratorStore.getState().pose;
      // Only break a resting idle, and only while the tab is visible.
      if (pose !== PHOTO_POSES.Idle || document.hidden) {
        scheduleNext(rand(REST_GAP));
        return;
      }
      setGesture(pick(GESTURES));
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        setGesture(null);
        scheduleNext(rand(REST_GAP));
      }, rand(HOLD));
    };

    scheduleNext(rand(FIRST_DELAY));

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setGesture(null);
    };
  }, [setGesture]);

  return null;
};

export default IdleJuice;
