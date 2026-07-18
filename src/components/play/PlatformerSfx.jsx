"use client";

import { useFrame } from "@react-three/fiber";
import { characterStatus } from "bvhecctrl";
import { useEffect, useRef } from "react";

// The authored loops are 1.367s (walk) and 0.7s (sprint). The walk cue is
// intentionally a touch slower than literal alternating contacts so its soft
// procedural sound lines up with the perceived planted step rather than every
// foot crossing.
const WALK_STEP_SECONDS = 0.76;
const RUN_STEP_SECONDS = 0.29;

const makeNoiseBuffer = (context) => {
  const buffer = context.createBuffer(
    1,
    context.sampleRate * 0.35,
    context.sampleRate,
  );
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }
  return buffer;
};

const connectOutput = (context, volume, pan = 0) => {
  const gain = context.createGain();
  gain.gain.value = volume;
  if (typeof context.createStereoPanner !== "function") {
    gain.connect(context.destination);
    return gain;
  }
  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  gain.connect(panner).connect(context.destination);
  return gain;
};

const playNoise = (
  context,
  buffer,
  { duration, volume, frequency, type = "lowpass", pan = 0 },
) => {
  const now = context.currentTime;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const output = connectOutput(context, volume, pan);
  source.buffer = buffer;
  filter.type = type;
  filter.frequency.value = frequency;
  output.gain.setValueAtTime(volume, now);
  output.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter).connect(output);
  source.start(now);
  source.stop(now + duration);
};

const playTone = (context, { from, to, duration, volume, type = "sine" }) => {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const output = connectOutput(context, volume);
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, now);
  oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
  output.gain.setValueAtTime(volume, now);
  output.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(output);
  oscillator.start(now);
  oscillator.stop(now + duration);
};

const PlatformerSfx = () => {
  const contextRef = useRef(null);
  const noiseRef = useRef(null);
  const previousGrounded = useRef(true);
  const previousVerticalSpeed = useRef(0);
  const nextStepAt = useRef(0);
  const stepSide = useRef(1);

  useEffect(() => {
    const unlock = () => {
      if (!contextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        contextRef.current = new AudioContext();
        noiseRef.current = makeNoiseBuffer(contextRef.current);
      }
      if (contextRef.current.state === "suspended") {
        void contextRef.current.resume();
      }
    };

    window.addEventListener("keydown", unlock);
    window.addEventListener("pointerdown", unlock);
    return () => {
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
      if (contextRef.current && contextRef.current.state !== "closed") {
        void contextRef.current.close();
      }
    };
  }, []);

  useFrame(({ clock }) => {
    const context = contextRef.current;
    const noise = noiseRef.current;
    const grounded = characterStatus.isOnGround;
    const verticalSpeed = characterStatus.linvel.y;
    const horizontalSpeed = Math.hypot(
      characterStatus.linvel.x,
      characterStatus.linvel.z,
    );

    if (context?.state === "running" && noise) {
      if (previousGrounded.current && !grounded && verticalSpeed > 0.5) {
        playTone(context, {
          from: 165,
          to: 330,
          duration: 0.13,
          volume: 0.035,
          type: "triangle",
        });
      }

      if (!previousGrounded.current && grounded) {
        const impact = Math.min(
          1,
          Math.max(0.35, -previousVerticalSpeed.current / 8),
        );
        playNoise(context, noise, {
          duration: 0.12,
          volume: 0.065 * impact,
          frequency: 420,
        });
        playTone(context, {
          from: 78,
          to: 46,
          duration: 0.11,
          volume: 0.035 * impact,
        });
      }

      const moving = grounded && horizontalSpeed > 0.45;
      if (moving && clock.elapsedTime >= nextStepAt.current) {
        const running = horizontalSpeed > 3.3;
        playNoise(context, noise, {
          duration: running ? 0.045 : 0.055,
          volume: running ? 0.032 : 0.025,
          frequency: stepSide.current > 0 ? 260 : 210,
          type: "bandpass",
          pan: stepSide.current * 0.08,
        });
        stepSide.current *= -1;
        nextStepAt.current =
          clock.elapsedTime + (running ? RUN_STEP_SECONDS : WALK_STEP_SECONDS);
      } else if (!moving) {
        nextStepAt.current = clock.elapsedTime;
      }
    }

    previousGrounded.current = grounded;
    previousVerticalSpeed.current = verticalSpeed;
  });

  return null;
};

export default PlatformerSfx;
