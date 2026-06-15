"use client";

import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { Vector3 } from "three";
import { SkeletonUtils } from "three-stdlib";
import { EngineErrorBoundary } from "@/components/scene/EngineErrorBoundary";
import { useCombinedTexture } from "@/hooks/useCombinedTexture";
import { DEFAULT_SKIN_COLOR, pb } from "@/stores/useConfiguratorStore";
import WallAsset from "./WallAsset";

const MAX_ACTIVE_GESTURES = 2;
const MAX_HERO_ACTIVE_GESTURES = 1;
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

function resolvePickedAsset(picked, assetsById) {
  if (!picked) return null;
  if (picked.asset) return picked.asset;
  if (picked.assetId) return assetsById?.get(picked.assetId) || null;
  return null;
}

function isImageUrl(url) {
  return /\.(png|jpe?g|webp)$/i.test(url.split("?")[0]);
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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const remap = (value, inMin, inMax, outMin, outMax) =>
  ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

const smoothStep = (value) => value * value * (3 - 2 * value);

function dampAngle(current, target, lambda, delta) {
  const difference =
    THREE.MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) -
    Math.PI;
  return current + THREE.MathUtils.damp(0, difference, lambda, delta);
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
  label = null,
  motionMode = "wall",
}) {
  const group = useRef();
  const labelAnchor = useRef();
  const headWorldPos = useRef(new THREE.Vector3());
  const headLocalPos = useRef(new THREE.Vector3());
  const anchorPositionRef = useRef(
    new THREE.Vector3(position[0], position[1], position[2]),
  );
  // PB schema lives at the top of the record — `gender` and `customization`
  // are direct fields, not nested under a `config` blob. Each customization
  // entry stores an `assetId` (PB relation), not an embedded asset record;
  // the lookup happens against the `assetsById` map prepared in WallView.
  const gender = character.gender || "woman";
  const { scene } = useGLTF(`/models/characters/${gender}/Armature.glb`);
  const { animations } = useGLTF(`/models/characters/${gender}/Animations.glb`);
  const wallAnimations = useMemo(
    () =>
      animations.map((clip) => {
        const localClip = clip.clone();
        localClip.tracks = localClip.tracks.filter(
          (track) => !track.name.startsWith("Rig."),
        );
        return localClip;
      }),
    [animations],
  );
  const { actions, names, mixer } = useAnimations(wallAnimations, group);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const baseActionRef = useRef(null);
  const gestureRef = useRef(null);
  const firstWalkRef = useRef(false);
  const readyRef = useRef(false);
  const revealReadyRef = useRef(false);
  const assetsReadyRef = useRef(false);
  const revealedRef = useRef(false);
  const readyAtRef = useRef(null);
  const assetFallbackAtRef = useRef(null);
  const nextGestureAtRef = useRef(0);
  const gestureEndsAtRef = useRef(0);
  const [loadedAssetKeys, setLoadedAssetKeys] = useState(() => new Set());
  const [visible, setVisible] = useState(false);
  const seed = useMemo(
    () => hashString(`${character.id || character.name || index}`),
    [character.id, character.name, index],
  );
  const isHero = motionMode === "hero";
  const height =
    typeof character.height === "number" ? clamp(character.height, 0.5, 2) : 1;
  const targetScale = scale * remap(height, 0.5, 2, 0.7, 1.1);
  const morphValues = useMemo(
    () => character.morphValues || {},
    [character.morphValues],
  );
  const skinColor =
    character.customization?.Skin?.color ||
    character.customization?.skin?.color ||
    DEFAULT_SKIN_COLOR;
  const makeupUrls = useMemo(() => {
    if (isHero) return [];
    const urls = [];
    Object.values(character.customization || {}).forEach((picked) => {
      const url = assetUrl(resolvePickedAsset(picked, assetsById));
      if (url && isImageUrl(url)) urls.push(url);
    });
    return urls.sort();
  }, [assetsById, character.customization, isHero]);
  const renderEntries = useMemo(() => {
    const entries = [];
    Object.entries(character.customization || {}).forEach(
      ([category, picked]) => {
        const asset = resolvePickedAsset(picked, assetsById);
        const url = assetUrl(asset);
        if (!asset || !url || isImageUrl(url)) return;
        entries.push({
          key: `${category}:${asset.id || url}`,
          category,
          entry: {
            asset,
            color: picked.color,
            colors: picked.colors,
          },
        });
      },
    );
    return entries;
  }, [assetsById, character.customization]);
  const expectedAssetKey = useMemo(
    () => renderEntries.map((entry) => entry.key).join("|"),
    [renderEntries],
  );
  const assetResetKey = `${character.id}:${expectedAssetKey}`;
  const assetsReady = useMemo(
    () => renderEntries.every((entry) => loadedAssetKeys.has(entry.key)),
    [loadedAssetKeys, renderEntries],
  );
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
  const headBone = useMemo(() => findHeadBone(clone), [clone]);
  const skeleton = useMemo(() => {
    let clonedSkeleton = null;

    clone.traverse((object) => {
      if (!clonedSkeleton && object.isSkinnedMesh) {
        clonedSkeleton = object.skeleton;
      }
    });

    return clonedSkeleton;
  }, [clone]);

  useEffect(() => {
    void assetResetKey;
    setLoadedAssetKeys(new Set());
    setVisible(false);
    readyRef.current = false;
    revealedRef.current = false;
    readyAtRef.current = null;
    assetFallbackAtRef.current = null;
    anchorPositionRef.current.set(position[0], position[1], position[2]);
  }, [assetResetKey, position[0], position[1], position[2]]);

  useEffect(() => {
    revealReadyRef.current = !!skeleton && !!makeupTexture;
  }, [makeupTexture, skeleton]);

  useEffect(() => {
    assetsReadyRef.current = assetsReady;
  }, [assetsReady]);

  const markAssetReady = useCallback((key) => {
    setLoadedAssetKeys((current) => {
      if (current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    const original = mixer.update.bind(mixer);
    const guarded = (delta) => {
      try {
        return original(delta);
      } catch (err) {
        console.warn(
          "[wall] animation mixer.update threw — skipping frame",
          err,
        );
        return mixer;
      }
    };
    mixer.update = guarded;
    return () => {
      if (mixer.update === guarded) mixer.update = original;
    };
  }, [mixer]);

  const animationPlan = useMemo(() => {
    const idle =
      findClipName(wallAnimations, "Rig|Idle_Loop", "idle") || names[0];
    const talk =
      findClipName(wallAnimations, "Rig|Idle_Talking_Loop", "talking") || idle;
    const walk =
      findClipName(wallAnimations, "Rig|Walk_Formal_Loop", "walk_formal") ||
      findClipName(wallAnimations, "Rig|Walk_Loop", "walk");
    const dance = findClipName(wallAnimations, "Rig|Dance_Loop", "dance");
    const spell = findClipName(
      wallAnimations,
      "Rig|Spell_Simple_Idle_Loop",
      "spell",
    );
    const pistol = findClipName(
      wallAnimations,
      "Rig|Pistol_Idle_Loop",
      "pistol",
    );
    const gestures = [
      talk && {
        clip: talk,
        type: "talk",
        weight: isHero ? 0.18 : 0.16,
        duration: (isHero ? 2.1 : 2.5) + ((seed >>> 4) % 18) / 10,
        timeScale: (isHero ? 0.82 : 0.74) + ((seed >>> 8) % 12) / 100,
      },
      walk && {
        clip: walk,
        type: "walk",
        weight: isHero ? 0.66 : 0.44,
        duration: (isHero ? 3.4 : 3.2) + ((seed >>> 7) % 12) / 10,
        timeScale: (isHero ? 0.84 : 0.62) + ((seed >>> 11) % 10) / 100,
      },
      dance && {
        clip: dance,
        type: "dance",
        weight: isHero ? 0.08 : 0.18,
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
      baseTimeScale: (isHero ? 0.86 : 0.78) + ((seed >>> 8) % 14) / 100,
      gestures,
    };
  }, [isHero, names, seed, wallAnimations]);
  useEffect(() => {
    baseActionRef.current = null;
    gestureRef.current = null;
    firstWalkRef.current = false;
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

  const motionProfile = useMemo(
    () => ({
      phase: (seed % 628) / 100,
      idleX: isHero ? 0.014 + ((seed >>> 3) % 9) / 1000 : 0.008,
      idleZ: isHero ? 0.018 + ((seed >>> 7) % 12) / 1000 : 0.01,
      walkX: isHero ? 0.055 + ((seed >>> 5) % 12) / 1000 : 0.032,
      walkZ: isHero ? 0.075 + ((seed >>> 9) % 16) / 1000 : 0.042,
      yaw: isHero ? 0.028 + ((seed >>> 4) % 8) / 1000 : 0.018,
      bob: isHero ? 0.006 + ((seed >>> 6) % 5) / 1000 : 0.004,
    }),
    [isHero, seed],
  );

  const handlePointerEnter = useCallback(
    (event) => {
      event.stopPropagation();
      const headWorldPos =
        headBone?.getWorldPosition(new Vector3()) ||
        group.current
          ?.getWorldPosition(new Vector3())
          .add(new Vector3(0, 1.5, 0));
      if (!headWorldPos) return;

      onHover?.({
        id: character.id,
        name: character.name,
        headWorldPos,
      });
    },
    [character.id, character.name, headBone, onHover],
  );

  const handlePointerLeave = useCallback(
    (event) => {
      event.stopPropagation();
      onHover?.(null);
    },
    [onHover],
  );

  const createWalkPath = useCallback(
    (now, duration) => {
      const from =
        group.current?.position.clone() || anchorPositionRef.current.clone();
      from.y = position[1];

      const radiusX = isHero ? 1.24 : 0.28;
      const radiusZ = isHero ? 0.72 : 0.22;
      const seededAngle = ((seed >>> 5) % 628) / 100;
      let angle = seededAngle + now * 0.43 + Math.random() * Math.PI * 0.72;
      let to = new THREE.Vector3(
        position[0] + Math.cos(angle) * radiusX,
        position[1],
        position[2] + Math.sin(angle) * radiusZ,
      );

      if (from.distanceToSquared(to) < (isHero ? 0.78 : 0.12)) {
        angle += Math.PI;
        to = new THREE.Vector3(
          position[0] + Math.cos(angle) * radiusX,
          position[1],
          position[2] + Math.sin(angle) * radiusZ,
        );
      }

      const travelDistance = from.distanceTo(to);
      const targetSpeed = isHero ? 0.54 + ((seed >>> 12) % 10) / 100 : 0.22;
      const travelDuration = clamp(
        travelDistance / targetSpeed,
        isHero ? 2.25 : 2.1,
        Math.max(duration, isHero ? 3.3 : 2.8),
      );
      const start = now + 0.08;

      return {
        from,
        to,
        start,
        end: start + travelDuration,
        yaw: Math.atan2(to.x - from.x, to.z - from.z),
      };
    },
    [isHero, position[0], position[1], position[2], seed],
  );

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime;
    const frameDelta = Math.min(delta, 0.05);
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
      readyAtRef.current = now + (isHero ? 0.34 : 0.18);
      assetFallbackAtRef.current = now + (isHero ? 2.4 : 1.4);
      nextGestureAtRef.current = isHero
        ? now + 1.1 + index * 0.42 + ((seed >>> 5) % 18) / 10
        : now + 7 + index * 1.8 + ((seed >>> 5) % 70) / 10;
    }

    const visualAssetsReady =
      assetsReadyRef.current ||
      (assetFallbackAtRef.current && now >= assetFallbackAtRef.current);

    if (
      !readyRef.current &&
      readyAtRef.current &&
      now >= readyAtRef.current &&
      revealReadyRef.current &&
      visualAssetsReady
    ) {
      readyRef.current = true;
      revealedRef.current = true;
      setVisible(true);
      group.current?.scale.setScalar(targetScale);
      onReady?.(character.id);
    }

    if (!readyRef.current) return;

    const currentGesture = gestureRef.current;
    const walking = currentGesture?.type === "walk";
    const phase = now * (walking ? 0.88 : 0.48) + motionProfile.phase;
    if (group.current) {
      const walkPath = walking ? currentGesture.path : null;
      if (walkPath) {
        const progress = clamp(
          (now - walkPath.start) / (walkPath.end - walkPath.start),
          0,
          1,
        );
        anchorPositionRef.current.lerpVectors(
          walkPath.from,
          walkPath.to,
          smoothStep(progress),
        );
        group.current.position.set(
          anchorPositionRef.current.x,
          position[1] + Math.sin(phase * 1.8) * motionProfile.bob,
          anchorPositionRef.current.z,
        );
        const targetYaw =
          THREE.MathUtils.lerp(rotationY, walkPath.yaw, 0.78) +
          Math.sin(phase * 0.7) * 0.02;
        group.current.rotation.y = dampAngle(
          group.current.rotation.y,
          targetYaw,
          isHero ? 3.4 : 5.4,
          frameDelta,
        );
      } else {
        group.current.position.set(
          anchorPositionRef.current.x +
            Math.sin(phase * 0.73) * motionProfile.idleX,
          position[1] + Math.sin(phase * 1.8) * motionProfile.bob,
          anchorPositionRef.current.z +
            Math.cos(phase * 0.61) * motionProfile.idleZ,
        );
        group.current.rotation.y = dampAngle(
          group.current.rotation.y,
          rotationY + Math.sin(phase * 0.5) * motionProfile.yaw,
          isHero ? 4.2 : 5.8,
          frameDelta,
        );
      }
      group.current.scale.setScalar(targetScale);

      if (labelAnchor.current && headBone) {
        headBone.getWorldPosition(headWorldPos.current);
        group.current.worldToLocal(
          headLocalPos.current.copy(headWorldPos.current),
        );
        headLocalPos.current.y += isHero ? 0.36 : 0.26;
        labelAnchor.current.position.lerp(headLocalPos.current, 0.42);
      }
    }

    if (currentGesture && now >= gestureEndsAtRef.current) {
      baseAction.reset().play();
      baseAction.setEffectiveTimeScale(animationPlan.baseTimeScale);
      baseAction.crossFadeFrom(currentGesture.action, 0.72, false);
      currentGesture.action.fadeOut(0.72);
      if (currentGesture.path) {
        anchorPositionRef.current.copy(currentGesture.path.to);
      }
      activeCrowdGestures = Math.max(0, activeCrowdGestures - 1);
      if (currentGesture.type === "talk") {
        activeTalkingGestures = Math.max(0, activeTalkingGestures - 1);
      }
      gestureRef.current = null;
      nextGestureAtRef.current = isHero
        ? now + 5 + Math.random() * 8 + index * 0.25
        : now + 14 + Math.random() * 24 + index * 0.4;
      return;
    }

    const maxActiveGestures = isHero
      ? MAX_HERO_ACTIVE_GESTURES
      : MAX_ACTIVE_GESTURES;
    if (
      currentGesture ||
      now < nextGestureAtRef.current ||
      activeCrowdGestures >= maxActiveGestures ||
      animationPlan.gestures.length === 0
    ) {
      return;
    }

    const availableGestures = animationPlan.gestures.filter((gesture) => {
      if (!actions[gesture.clip]) return false;
      if (gesture.type !== "talk") return true;
      return activeTalkingGestures === 0 && now - lastTalkingStartedAt > 5;
    });
    const firstWalk =
      isHero && !firstWalkRef.current
        ? availableGestures.find((item) => item.type === "walk")
        : null;
    const gesture = firstWalk || weightedPick(availableGestures);
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
    gestureAction.crossFadeFrom(baseAction, 0.72, false);
    const path =
      gesture.type === "walk" ? createWalkPath(now, gesture.duration) : null;
    gestureRef.current = {
      action: gestureAction,
      type: gesture.type,
      path,
    };
    if (gesture.type === "walk") firstWalkRef.current = true;
    gestureEndsAtRef.current = path ? path.end + 0.14 : now + gesture.duration;
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
      scale={targetScale}
      visible={visible}
      // The asset rig's local-axis "front" already points toward +Z, so each
      // slot only adds a subtle yaw for a community-stage pose.
    >
      {visible && onHover && (
        <mesh
          position={[0, 0.88, 0.02]}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <capsuleGeometry args={[0.42, 1.34, 8, 16]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            colorWrite={false}
          />
        </mesh>
      )}
      {boneRoots.root && <primitive object={boneRoots.root} />}
      {boneRoots.eyes && <primitive object={boneRoots.eyes} />}
      {visible && label && (
        <group ref={labelAnchor} position={[0, 2.05, 0]}>
          <Html center distanceFactor={5.4} zIndexRange={[0, 0]}>
            <div className="min-w-20 whitespace-nowrap rounded-md border border-white/10 bg-black/50 px-2 py-1 text-center shadow-[0_10px_22px_rgba(0,0,0,0.26)] backdrop-blur-md">
              <div className="max-w-24 truncate text-[10px] font-semibold tracking-tight text-white">
                {label.name}
              </div>
              <div className="max-w-24 truncate text-[8px] font-medium tracking-tight text-white/50">
                by {label.creator}
              </div>
            </div>
          </Html>
        </group>
      )}
      {skeleton &&
        renderEntries.map(({ category, entry, key }) => {
          return (
            <EngineErrorBoundary
              key={category}
              label={`wall-part:${category}`}
              resetKey={`${character.id}:${key}`}
              onError={() => markAssetReady(key)}
            >
              <Suspense fallback={null}>
                <WallAsset
                  entry={entry}
                  skeleton={skeleton}
                  skinMaterial={skinMaterial}
                  morphValues={morphValues}
                  onReady={() => markAssetReady(key)}
                />
              </Suspense>
            </EngineErrorBoundary>
          );
        })}
    </group>
  );
}

useGLTF.preload("/models/characters/man/Armature.glb");
useGLTF.preload("/models/characters/man/Animations.glb");
useGLTF.preload("/models/characters/woman/Armature.glb");
useGLTF.preload("/models/characters/woman/Animations.glb");
