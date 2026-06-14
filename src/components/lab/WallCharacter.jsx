"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Vector3 } from "three";
import { SkeletonUtils } from "three-stdlib";
import { useCombinedTexture } from "@/hooks/useCombinedTexture";
import { DEFAULT_SKIN_COLOR, pb } from "@/stores/useConfiguratorStore";
import WallAsset from "./WallAsset";

const MAX_ACTIVE_GESTURES = 2;
let activeCrowdGestures = 0;
let activeTalkingGestures = 0;
let lastTalkingStartedAt = -Number.POSITIVE_INFINITY;

function findHeadBone(root) {
  const exact = root.getObjectByName("DEF-head");
  if (exact) return exact;

  let fallback = null;
  root.traverse((child) => {
    if (!fallback && child.name?.toLowerCase().includes("head")) {
      fallback = child;
    }
  });

  return fallback;
}

function firstClipNameMatching(animations, match) {
  return animations.find((clip) => clip.name.toLowerCase().includes(match))
    ?.name;
}

function findClipName(animations, exact, fallbackMatch = null) {
  return (
    animations.find((clip) => clip.name === exact)?.name ||
    (fallbackMatch ? firstClipNameMatching(animations, fallbackMatch) : null)
  );
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function assetUrl(asset) {
  if (!asset) return null;
  if (asset.r2Url) return asset.r2Url;
  if (asset.url) return pb.files.getURL(asset, asset.url);
  return null;
}

function isImageUrl(url) {
  return /\.(png|jpe?g|webp)$/i.test(url);
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item;
  }
  return items[items.length - 1] || null;
}

export default function WallCharacter({
  character,
  assetsById,
  position,
  rotationY = 0,
  scale = 1,
  index,
  onHover,
  onReady,
}) {
  const group = useRef();
  // PB schema lives at the top of the record — `gender` and `customization`
  // are direct fields, not nested under a `config` blob. Each customization
  // entry stores an `assetId` (PB relation), not an embedded asset record;
  // the lookup happens against the `assetsById` map prepared in WallView.
  const gender = character.gender || "woman";
  const { scene } = useGLTF(`/models/characters/${gender}/Armature.glb`);
  const { animations } = useGLTF(`/models/characters/${gender}/Animations.glb`);
  const { actions, names } = useAnimations(animations, group);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const baseActionRef = useRef(null);
  const gestureRef = useRef(null);
  const readyRef = useRef(false);
  const readyAtRef = useRef(null);
  const nextGestureAtRef = useRef(0);
  const gestureEndsAtRef = useRef(0);
  const seed = useMemo(
    () => hashString(`${character.id || character.name || index}`),
    [character.id, character.name, index],
  );
  const skinColor = character.customization?.Skin?.color || DEFAULT_SKIN_COLOR;
  const makeupUrls = useMemo(() => {
    const urls = [];
    Object.values(character.customization || {}).forEach((picked) => {
      if (!picked?.assetId) return;
      const url = assetUrl(assetsById?.get(picked.assetId));
      if (url && isImageUrl(url)) urls.push(url);
    });
    return urls.sort();
  }, [assetsById, character.customization]);
  const makeupTexture = useCombinedTexture(makeupUrls, skinColor);
  const skinMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: DEFAULT_SKIN_COLOR,
        roughness: 1,
      }),
    [],
  );

  useEffect(() => {
    if (!makeupTexture) return;
    skinMaterial.map = makeupTexture;
    skinMaterial.color.set("#ffffff");
    skinMaterial.needsUpdate = true;
  }, [skinMaterial, makeupTexture]);

  useEffect(() => () => skinMaterial.dispose(), [skinMaterial]);

  // Mirror the editor's Avatar render: mount only the bone subtrees
  // (`root` + `MCH-eyes_parent`), not the whole clone. The clone's
  // Plane.002 placeholder mesh would otherwise render as a stray quad
  // at the floor — visible as the big flat artifact in the first pass.
  const boneRoots = useMemo(() => {
    const root = clone.getObjectByName("root");
    const eyes = clone.getObjectByName("MCH-eyes_parent");
    return { root, eyes };
  }, [clone]);
  const skeleton = useMemo(() => {
    let clonedSkeleton = null;

    clone.traverse((object) => {
      if (!clonedSkeleton && object.isSkinnedMesh) {
        clonedSkeleton = object.skeleton;
      }
    });

    return clonedSkeleton;
  }, [clone]);

  const animationPlan = useMemo(() => {
    const idle = findClipName(animations, "Rig|Idle_Loop", "idle") || names[0];
    const talk =
      findClipName(animations, "Rig|Idle_Talking_Loop", "talking") || idle;
    const walk =
      findClipName(animations, "Rig|Walk_Formal_Loop", "walk_formal") ||
      findClipName(animations, "Rig|Walk_Loop", "walk");
    const dance = findClipName(animations, "Rig|Dance_Loop", "dance");
    const spell = findClipName(
      animations,
      "Rig|Spell_Simple_Idle_Loop",
      "spell",
    );
    const pistol = findClipName(animations, "Rig|Pistol_Idle_Loop", "pistol");
    const gestures = [
      talk && {
        clip: talk,
        type: "talk",
        weight: 0.16,
        duration: 2.5 + ((seed >>> 4) % 18) / 10,
        timeScale: 0.74 + ((seed >>> 8) % 12) / 100,
      },
      walk && {
        clip: walk,
        type: "walk",
        weight: 0.44,
        duration: 3.2 + ((seed >>> 7) % 18) / 10,
        timeScale: 0.62 + ((seed >>> 11) % 12) / 100,
      },
      dance && {
        clip: dance,
        type: "dance",
        weight: 0.18,
        duration: 2.8 + ((seed >>> 10) % 16) / 10,
        timeScale: 0.5 + ((seed >>> 13) % 10) / 100,
      },
      spell && {
        clip: spell,
        type: "pose",
        weight: 0.12,
        duration: 2.8 + ((seed >>> 6) % 12) / 10,
        timeScale: 0.62,
      },
      pistol && {
        clip: pistol,
        type: "pose",
        weight: 0.1,
        duration: 2.6 + ((seed >>> 9) % 12) / 10,
        timeScale: 0.62,
      },
    ].filter(Boolean);

    return {
      base: idle,
      baseTimeScale: 0.78 + ((seed >>> 8) % 14) / 100,
      gestures,
    };
  }, [animations, names, seed]);
  useEffect(() => {
    baseActionRef.current = null;
    gestureRef.current = null;
    readyRef.current = false;
    readyAtRef.current = null;
    gestureEndsAtRef.current = 0;
    nextGestureAtRef.current = 0;

    return () => {
      const currentGesture = gestureRef.current;
      if (currentGesture) {
        activeCrowdGestures = Math.max(0, activeCrowdGestures - 1);
        if (currentGesture.type === "talk") {
          activeTalkingGestures = Math.max(0, activeTalkingGestures - 1);
        }
      }
      baseActionRef.current?.stop();
      currentGesture?.action?.stop();
      baseActionRef.current = null;
      gestureRef.current = null;
    };
  }, []);

  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    const baseAction = actions[animationPlan.base];
    if (!baseAction) return;

    if (!baseActionRef.current) {
      baseAction
        .reset()
        .setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY)
        .fadeIn(0.2)
        .play();
      baseAction.time =
        ((seed % 1000) / 1000) * (baseAction.getClip().duration || 1);
      baseAction.setEffectiveTimeScale(animationPlan.baseTimeScale);
      baseActionRef.current = baseAction;
      readyAtRef.current = now + 0.08;
      nextGestureAtRef.current =
        now + 7 + index * 1.8 + ((seed >>> 5) % 70) / 10;
    }

    if (!readyRef.current && readyAtRef.current && now >= readyAtRef.current) {
      readyRef.current = true;
      group.current?.scale.setScalar(scale);
      onReady?.(character.id);
    }

    if (!readyRef.current) return;

    const currentGesture = gestureRef.current;
    if (currentGesture && now >= gestureEndsAtRef.current) {
      baseAction.reset().play();
      baseAction.setEffectiveTimeScale(animationPlan.baseTimeScale);
      baseAction.crossFadeFrom(currentGesture.action, 0.55, false);
      currentGesture.action.fadeOut(0.55);
      activeCrowdGestures = Math.max(0, activeCrowdGestures - 1);
      if (currentGesture.type === "talk") {
        activeTalkingGestures = Math.max(0, activeTalkingGestures - 1);
      }
      gestureRef.current = null;
      nextGestureAtRef.current = now + 14 + Math.random() * 24 + index * 0.4;
      return;
    }

    if (
      currentGesture ||
      now < nextGestureAtRef.current ||
      activeCrowdGestures >= MAX_ACTIVE_GESTURES ||
      animationPlan.gestures.length === 0
    ) {
      return;
    }

    const availableGestures = animationPlan.gestures.filter((gesture) => {
      if (!actions[gesture.clip]) return false;
      if (gesture.type !== "talk") return true;
      return activeTalkingGestures === 0 && now - lastTalkingStartedAt > 5;
    });
    const gesture = weightedPick(availableGestures);
    const gestureAction = gesture ? actions[gesture.clip] : null;
    if (!gesture || !gestureAction) {
      nextGestureAtRef.current = now + 6 + Math.random() * 10;
      return;
    }

    gestureAction
      .reset()
      .setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY)
      .play();
    gestureAction.time =
      Math.random() * (gestureAction.getClip().duration || 1);
    gestureAction.setEffectiveTimeScale(gesture.timeScale);
    gestureAction.crossFadeFrom(baseAction, 0.45, false);
    gestureRef.current = {
      action: gestureAction,
      type: gesture.type,
    };
    gestureEndsAtRef.current = now + gesture.duration;
    activeCrowdGestures += 1;
    if (gesture.type === "talk") {
      activeTalkingGestures += 1;
      lastTalkingStartedAt = now;
    }
  });

  return (
    <group
      ref={group}
      position={position}
      rotation={[0, rotationY, 0]}
      scale={0.001}
      // The asset rig's local-axis "front" already points toward +Z, so each
      // slot only adds a subtle yaw for a community-stage pose.
      onPointerEnter={(event) => {
        event.stopPropagation();
        const bone = findHeadBone(clone);
        if (!bone) return;

        const headWorldPos = bone.getWorldPosition(new Vector3());
        onHover?.({
          id: character.id,
          name: character.name,
          headWorldPos,
        });
      }}
      onPointerLeave={(event) => {
        event.stopPropagation();
        onHover?.(null);
      }}
    >
      {boneRoots.root && <primitive object={boneRoots.root} />}
      {boneRoots.eyes && <primitive object={boneRoots.eyes} />}
      {skeleton &&
        Object.entries(character.customization || {}).map(
          ([category, picked]) => {
            if (!picked?.assetId) return null;
            const asset = assetsById?.get(picked.assetId);
            if (!asset) return null;
            // WallAsset expects an `entry` with an embedded `asset` —
            // synthesise it from the resolved record + picked colours.
            const entry = {
              asset,
              color: picked.color,
              colors: picked.colors,
            };
            return (
              <Suspense key={category} fallback={null}>
                <WallAsset
                  entry={entry}
                  skeleton={skeleton}
                  skinMaterial={skinMaterial}
                />
              </Suspense>
            );
          },
        )}
    </group>
  );
}

useGLTF.preload("/models/characters/man/Armature.glb");
useGLTF.preload("/models/characters/man/Animations.glb");
useGLTF.preload("/models/characters/woman/Armature.glb");
useGLTF.preload("/models/characters/woman/Animations.glb");
