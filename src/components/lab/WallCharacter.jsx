"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { LoopOnce, Vector3 } from "three";
import { SkeletonUtils } from "three-stdlib";
import WallAsset from "./WallAsset";

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

export default function WallCharacter({
  character,
  assetsById,
  position,
  index,
  onHover,
}) {
  const group = useRef();
  // PB schema lives at the top of the record — `gender` and `customization`
  // are direct fields, not nested under a `config` blob. Each customization
  // entry stores an `assetId` (PB relation), not an embedded asset record;
  // the lookup happens against the `assetsById` map prepared in WallView.
  const gender = character.gender || "woman";
  const { scene } = useGLTF(`/models/characters/${gender}/Armature.glb`);
  const { animations } = useGLTF(`/models/characters/${gender}/Animations.glb`);
  const { actions, mixer, names } = useAnimations(animations, group);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
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

  const idleName = useMemo(
    () => firstClipNameMatching(animations, "idle") || names[0],
    [animations, names],
  );
  const waveName = useMemo(
    () => firstClipNameMatching(animations, "wave"),
    [animations],
  );
  const lookName = useMemo(
    () => firstClipNameMatching(animations, "look"),
    [animations],
  );

  useEffect(() => {
    const idleAction = actions[idleName];
    if (!idleAction || !mixer) return;

    const oneShotNames = [waveName, lookName].filter(Boolean);
    let activeOneShot = null;
    let oneShotIndex =
      oneShotNames.length > 0 ? index % oneShotNames.length : 0;

    idleAction.reset().play();
    idleAction.time = Math.random() * idleAction.getClip().duration;

    const handleFinished = (event) => {
      if (event.action !== activeOneShot) return;

      event.action.fadeOut(0.25);
      idleAction.reset().fadeIn(0.25).play();
      activeOneShot = null;
    };

    mixer.addEventListener("finished", handleFinished);

    const intervalMs = 6000 + Math.random() * 8000;
    const intervalId =
      oneShotNames.length > 0
        ? window.setInterval(() => {
            if (activeOneShot) return;

            const oneShotName =
              oneShotNames[oneShotIndex % oneShotNames.length];
            const oneShot = actions[oneShotName];
            oneShotIndex += 1;
            if (!oneShot) return;

            activeOneShot = oneShot;
            idleAction.fadeOut(0.25);
            oneShot.reset().fadeIn(0.25).setLoop(LoopOnce, 1).play();
          }, intervalMs)
        : null;

    return () => {
      if (intervalId != null) window.clearInterval(intervalId);
      mixer.removeEventListener("finished", handleFinished);
      idleAction.stop();
      oneShotNames.forEach((name) => {
        actions[name]?.stop();
      });
    };
  }, [actions, idleName, index, lookName, mixer, waveName]);

  return (
    <group
      ref={group}
      position={position}
      // The asset rig's local-axis "front" already points toward +Z, so we
      // don't apply the editor's `[Math.PI, 0, Math.PI]` flip here — the
      // editor's camera sits at -Z and looks back at -Z, ours sits at +Z.
      rotation={[0, 0, 0]}
      onPointerEnter={(event) => {
        event.stopPropagation();
        const bone = findHeadBone(clone);
        if (!bone) return;

        const headWorldPos = bone.getWorldPosition(new Vector3());
        onHover({
          id: character.id,
          name: character.name,
          headWorldPos,
        });
      }}
      onPointerLeave={(event) => {
        event.stopPropagation();
        onHover(null);
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
                <WallAsset entry={entry} skeleton={skeleton} />
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
