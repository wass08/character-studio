"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { AnimationAction, AnimationClip, Group, Object3D } from "three";
import { SkeletonUtils } from "three-stdlib";
import { bakedCharacterUrl, sharedAnimationsUrl } from "@/lib/modelAssets";
import { useCharacter } from "./CharacterContext";

type BakedAvatarProps = {
  characterId: string;
};

type ModelGLTF = {
  scene: Object3D;
};

type AnimationsGLTF = {
  animations: AnimationClip[];
};

/**
 * Read-only renderer for a server-produced character bake. The bake already
 * contains the recipe's height, materials, morph defaults, and assembled
 * meshes; only the shared animation library remains external.
 */
export default function BakedAvatar({ characterId }: BakedAvatarProps) {
  const group = useRef<Group>(null);
  const { gender, pose, gesture } = useCharacter();
  const activePose = gesture || pose;
  const modelUrl = bakedCharacterUrl(characterId);
  const animationUrl = sharedAnimationsUrl(gender);
  const { scene } = useGLTF(modelUrl) as unknown as ModelGLTF;
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { animations } = useGLTF(animationUrl) as unknown as AnimationsGLTF;
  const localAnimations = useMemo(
    () =>
      animations.map((clip) => {
        const localClip = clip.clone();
        localClip.tracks = localClip.tracks.filter(
          (track) => !track.name.includes(".scale"),
        );
        return localClip;
      }),
    [animations],
  );
  const { actions, mixer } = useAnimations(localAnimations, group);
  const previousAction = useRef<AnimationAction | null>(null);

  useEffect(() => {
    const original = mixer.update.bind(mixer);
    const guarded = (delta: number) => {
      try {
        return original(delta);
      } catch (error) {
        console.warn(
          "[baked-avatar] animation mixer.update threw — skipping frame",
          error,
        );
        return mixer;
      }
    };
    mixer.update = guarded;
    return () => {
      if (mixer.update === guarded) mixer.update = original;
    };
  }, [mixer]);

  useEffect(() => {
    void localAnimations;
    previousAction.current = null;
  }, [localAnimations]);

  useEffect(() => {
    const next = actions[activePose];
    if (!next) return;
    const previous = previousAction.current;
    next.reset().play();
    if (previous && previous !== next) {
      next.crossFadeFrom(previous, 0.4, true);
    } else {
      next.fadeIn(0.4);
    }
    previousAction.current = next;
  }, [actions, activePose]);

  useFrame(() => {
    if (previousAction.current) return;
    const next = actions[activePose];
    if (!next) return;
    next.reset().fadeIn(0.3).play();
    previousAction.current = next;
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={clone} />
    </group>
  );
}
