"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import * as THREE from "three";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";

type Phase = "booting" | "exiting" | "done";

// Once the rig exists and every requested part reports settled, hold for a
// few frames so React effects can commit the final material/texture updates.
const SETTLE_SECONDS = 0.3;

/**
 * First-load placeholder: a near-white octahedron lit by the live scene
 * lights, spinning + bobbing + pulsing while the character's meshes decode,
 * then collapsing out to reveal the avatar.
 *
 * It's deliberately a self-contained LEAF rendered alongside the avatar:
 *  - Phase lives in LOCAL state (never the store), so it only re-renders
 *    itself — the engine's `SceneContent` (which owns the gl/scene/camera
 *    subscriptions + capture effects) is never re-rendered mid-load, which is
 *    what corrupted earlier store-driven attempts.
 *  - The avatar is hidden IMPERATIVELY (toggling the Rig's `.visible`), not via
 *    a React wrapper, so the avatar subtree is never re-rendered while it
 *    loads.
 *
 * Scoped to a full (re)build via the store's `loading` flag (initial load +
 * gender swap); part swaps don't flip `loading`, so it never reappears.
 */
export const BootDiamond = () => {
  const loading = useConfiguratorStore((s: { loading: boolean }) => s.loading);
  const pendingPartCount = useConfiguratorStore(
    (s: { assetLoading: Record<string, boolean> }) =>
      Object.keys(s.assetLoading).length,
  );
  const scene = useThree((s) => s.scene);
  const [phase, setPhase] = useState<Phase>("booting");

  const group = useRef<Group>(null);
  const elapsed = useRef(0);
  const scale = useRef(0);
  const settledFor = useRef(0);

  // Restart on every full (re)build.
  useEffect(() => {
    if (loading) {
      settledFor.current = 0;
      setPhase("booting");
    }
  }, [loading]);

  // Drive the avatar's visibility off the phase. This is the reveal: the
  // component returns null at "done" but stays MOUNTED (its parent always
  // renders it), so an unmount-cleanup reveal would never fire — and useFrame
  // stops touching the Rig once the mesh is gone, leaving it stuck hidden.
  // Setting it here (and per-frame below, to catch a late-loading armature)
  // guarantees the handoff. The cleanup covers an actual unmount (surface
  // change / provider teardown).
  useEffect(() => {
    const rig = scene.getObjectByName("Rig");
    if (rig) rig.visible = phase === "done";
    return () => {
      const r = scene.getObjectByName("Rig");
      if (r) r.visible = true;
    };
  }, [phase, scene]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;

    // Keep the avatar hidden behind the diamond until the handoff. Runs every
    // frame so it catches the Rig the moment its armature finishes loading.
    const rig = scene.getObjectByName("Rig");
    if (rig) rig.visible = false;

    if (phase === "booting") {
      if (!loading && pendingPartCount === 0 && rig) {
        settledFor.current += delta;
        if (settledFor.current >= SETTLE_SECONDS) setPhase("exiting");
      } else {
        settledFor.current = 0;
      }
    }

    elapsed.current += delta;
    g.rotation.y += delta * 0.9;
    g.position.y = 1.25 + Math.sin(elapsed.current * 1.4) * 0.045;

    const pulse = 1 + Math.sin(elapsed.current * 2.4) * 0.04;
    const exiting = phase === "exiting";
    const target = exiting ? 0 : pulse;
    scale.current = THREE.MathUtils.lerp(
      scale.current,
      target,
      exiting ? 0.2 : 0.12,
    );
    // Narrower in x/z than tall in y → an elongated gem rather than a fat
    // octahedron. Kept small — it's a placeholder, not the star of the scene.
    const s = scale.current;
    g.scale.set(s * 0.105, s * 0.185, s * 0.105);

    // Once collapsed, hand off: render null → the phase effect reveals the
    // avatar.
    if (exiting && scale.current < 0.02) setPhase("done");
  });

  if (phase === "done") return null;

  return (
    <group ref={group} position={[0, 1.25, 0.565]} scale={0}>
      {/* Translucent gem: flat-shaded faces + a faint inner glow read as a
          polished crystal instead of an opaque white blob. */}
      <mesh>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#e8e9f2"
          roughness={0.12}
          metalness={0.05}
          emissive="#8b8fa8"
          emissiveIntensity={0.22}
          flatShading
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
