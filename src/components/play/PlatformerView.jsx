"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Sky, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import Avatar from "@/components/scene/Avatar";
import LoadingScreen from "@/components/ui/LoadingScreen/LoadingScreen";
import PlayShell from "./PlayShell";
import NoCharacterOverlay from "./NoCharacterOverlay";
import {
  useConfiguratorStore,
  PHOTO_POSES,
  UI_MODES,
} from "@/stores/useConfiguratorStore";

/**
 * Phase-7 platformer: lightweight WASD movement on a flat plane with a
 * follow camera. Kept intentionally simple — this is "feel them move,"
 * not a game. A future iteration can swap in BVHEcctrl for real physics.
 */

const KEYS = { w: "f", a: "l", s: "b", d: "r", arrowup: "f", arrowdown: "b", arrowleft: "l", arrowright: "r", shift: "run" };

const useKeyboard = () => {
  const ref = useRef({ f: false, b: false, l: false, r: false, run: false });
  useEffect(() => {
    const down = (e) => {
      const k = KEYS[e.key.toLowerCase()];
      if (k) ref.current[k] = true;
    };
    const up = (e) => {
      const k = KEYS[e.key.toLowerCase()];
      if (k) ref.current[k] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  return ref;
};

const CharacterController = ({ groupRef }) => {
  const keys = useKeyboard();
  const setPose = useConfiguratorStore((s) => s.setPose);
  const vel = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Quaternion());
  const lastIsMoving = useRef(false);

  useFrame((_, dt) => {
    const grp = groupRef.current;
    if (!grp) return;
    const k = keys.current;
    const speed = (k.run ? 5.5 : 2.6);
    vel.current.set(
      (k.l ? -1 : 0) + (k.r ? 1 : 0),
      0,
      (k.f ? -1 : 0) + (k.b ? 1 : 0),
    );
    const moving = vel.current.lengthSq() > 0;
    if (moving) {
      vel.current.normalize().multiplyScalar(speed * dt);
      grp.position.add(vel.current);
      const angle = Math.atan2(vel.current.x, vel.current.z) + Math.PI;
      target.current.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      grp.quaternion.slerp(target.current, Math.min(1, dt * 12));
    }
    // Soft world bounds.
    grp.position.x = THREE.MathUtils.clamp(grp.position.x, -28, 28);
    grp.position.z = THREE.MathUtils.clamp(grp.position.z, -28, 28);

    if (moving !== lastIsMoving.current) {
      lastIsMoving.current = moving;
      setPose(moving ? PHOTO_POSES.Walk : PHOTO_POSES.Idle);
    }
  });

  return null;
};

const FollowCamera = ({ targetRef }) => {
  const cameraRef = useRef();
  const tmp = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const grp = targetRef.current;
    const cam = cameraRef.current;
    if (!grp || !cam) return;
    grp.getWorldPosition(tmp.current);
    desired.current.set(tmp.current.x, tmp.current.y + 3, tmp.current.z + 6);
    cam.position.lerp(desired.current, Math.min(1, dt * 6));
    cam.lookAt(tmp.current.x, tmp.current.y + 1.1, tmp.current.z);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={50}
      position={[0, 4, 8]}
    />
  );
};

const Scenery = () => (
  <>
    <color attach="background" args={["#7c95b0"]} />
    <Suspense fallback={null}>
      <Sky sunPosition={[100, 30, 100]} turbidity={6} />
      <Environment preset="city" environmentIntensity={0.55} />
    </Suspense>
    <ambientLight intensity={0.55} />
    <directionalLight
      position={[-12, 18, 8]}
      intensity={1.3}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      color="#fff2e3"
    />

    <mesh receiveShadow rotation-x={-Math.PI / 2}>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#3d4a55" />
    </mesh>
    {Array.from({ length: 10 }).map((_, i) => {
      const angle = (i / 10) * Math.PI * 2;
      const r = 10;
      return (
        <mesh
          key={i}
          castShadow
          receiveShadow
          position={[Math.cos(angle) * r, 0.5, Math.sin(angle) * r]}
        >
          <boxGeometry args={[1.2, 1, 1.2]} />
          <meshStandardMaterial color="#5b6c7a" />
        </mesh>
      );
    })}
  </>
);

const PlatformerScene = () => {
  const groupRef = useRef();
  const gender = useConfiguratorStore((s) => s.gender);

  return (
    <>
      <Scenery />
      <FollowCamera targetRef={groupRef} />
      <CharacterController groupRef={groupRef} />
      <group ref={groupRef} position={[0, 0, 0]}>
        <Suspense fallback={null}>
          <Avatar key={gender} />
        </Suspense>
      </group>
    </>
  );
};

const PlatformerView = () => {
  const setMode = useConfiguratorStore((s) => s.setMode);
  const introFinished = useConfiguratorStore((s) => s.introFinished);

  useEffect(() => {
    // Lets the avatar play its idle clip on entry. We override per-frame
    // through CharacterController based on actual movement.
    setMode(UI_MODES.CUSTOMIZE);
  }, [setMode]);

  return (
    <PlayShell title="Platformer">
      <Canvas
        shadows
        frameloop="always"
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: [0, 4, 8], fov: 50 }}
      >
        <PlatformerScene />
      </Canvas>
      {!introFinished && <LoadingScreen />}
      <NoCharacterOverlay />

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-6">
        <div className="glass-panel pointer-events-auto flex flex-wrap items-center gap-3 rounded-full px-4 py-2 text-[11px] tracking-tight text-white/75">
          <span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white/90">
              WASD
            </kbd>{" "}
            move
          </span>
          <span className="text-white/25">·</span>
          <span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white/90">
              Shift
            </kbd>{" "}
            run
          </span>
        </div>
      </div>
    </PlayShell>
  );
};

export default PlatformerView;
