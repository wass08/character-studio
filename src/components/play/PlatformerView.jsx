"use client";

import {
  Environment,
  KeyboardControls,
  PerspectiveCamera,
  Sky,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import BVHEcctrl, {
  Joystick,
  StaticCollider,
  useAnimationStore,
  VirtualButton,
} from "bvhecctrl";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import Avatar from "@/components/scene/Avatar";
import { StoreCharacterProvider } from "@/components/scene/CharacterContext";
import { EngineCanvas } from "@/components/scene/EngineCanvas";
import LoadingScreen from "@/components/ui/LoadingScreen/LoadingScreen";
import { UI_MODES, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import NoCharacterOverlay from "./NoCharacterOverlay";
import PlayShell from "./PlayShell";

/**
 * Platformer: a real character controller (mesh-BVH collision + floating
 * capsule) via `bvhecctrl`. WASD / arrows move, Shift runs, Space jumps —
 * all camera-relative, so "forward" is always away from the camera. The
 * controller turns the avatar toward movement and reports an animation
 * status we map onto the rig's clips. Touch users get an on-screen joystick
 * + jump/run buttons.
 */

// drei KeyboardControls map — BVHEcctrl reads these names internally.
const KEYBOARD_MAP = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
];

// Capsule + float tuning. BVHEcctrl centers the capsule on the controller
// group, so the ground sits a full capsule half-height plus the float gap
// below the origin: floatHeight + capsuleLength/2 + radius. Offsetting the
// model down by exactly that plants the avatar's feet on the floor (using
// only floatHeight + radius left it floating by capsuleLength/2 = 0.4).
const CAPSULE_RADIUS = 0.3;
const CAPSULE_LENGTH = 0.8;
const FLOAT_HEIGHT = 0.1;
const MODEL_Y = -(FLOAT_HEIGHT + CAPSULE_LENGTH / 2 + CAPSULE_RADIUS);
const SPAWN = [0, 1, 0];

// BVHEcctrl orients the model with lookAt (its local -Z faces the move
// direction); our rig's forward is the opposite, so flip it 180°.
const FACING_Y = Math.PI;

// Map BVHEcctrl's animation status onto the rig's clip names (all present in
// both genders' Animations.glb).
const STATUS_TO_CLIP = {
  IDLE: "Rig|Idle_Loop",
  WALK: "Rig|Walk_Loop",
  RUN: "Rig|Sprint_Loop",
  JUMP_START: "Rig|Jump_Start",
  JUMP_IDLE: "Rig|Jump_Loop",
  JUMP_FALL: "Rig|Jump_Loop",
  JUMP_LAND: "Rig|Jump_Land",
};

// Horizon tint — shared by the background, the fog, and (loosely) the Sky
// near its sun. Fog dissolves the ground quad's far edge into the sky so the
// floor reads as continuous ground rather than a hard-edged floating slab.
const HORIZON = "#7c95b0";

// Lights / sky / environment — decorative, not part of the collision world.
// The key (shadow-casting) light lives in PlatformerScene instead, where it
// can follow the character; see SunFollower.
const Decor = () => (
  <>
    <color attach="background" args={[HORIZON]} />
    <fog attach="fog" args={[HORIZON, 38, 85]} />
    <Suspense fallback={null}>
      <Sky sunPosition={[100, 30, 100]} turbidity={6} />
      <Environment preset="city" environmentIntensity={0.55} />
    </Suspense>
    <ambientLight intensity={0.55} />
  </>
);

// Sun offset from the character — the light and its shadow target ride along
// with the avatar so the (tight) ortho shadow frustum stays centred on it.
// Without this the default ±5 frustum sits at the world origin and shadows
// vanish the moment the character walks away from spawn.
const SUN_OFFSET = new THREE.Vector3(-12, 18, 8);

const SunFollower = ({ ecctrlRef }) => {
  const lightRef = useRef();
  const charPos = useRef(new THREE.Vector3());

  useFrame(() => {
    const grp = ecctrlRef.current?.group;
    const light = lightRef.current;
    if (!grp || !light) return;
    grp.getWorldPosition(charPos.current);
    light.position.copy(charPos.current).add(SUN_OFFSET);
    light.target.position.copy(charPos.current);
    // Target isn't in the scene graph, so its world matrix won't update on
    // its own — the shadow camera reads target.matrixWorld for its lookAt.
    light.target.updateMatrixWorld();
  });

  return (
    <directionalLight
      ref={lightRef}
      intensity={1.3}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-near={1}
      shadow-camera-far={60}
      shadow-camera-left={-16}
      shadow-camera-right={16}
      shadow-camera-top={16}
      shadow-camera-bottom={-16}
      shadow-bias={-0.0001}
      shadow-normalBias={0.04}
      color="#fff2e3"
    />
  );
};

// A ring of pillars to run around and into.
const PILLARS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  const r = 10;
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
});

// Ascending stair-steps — exercises the floating capsule on ledges.
const STEPS = Array.from({ length: 4 }, (_, i) => ({
  x: -6 - i * 1.4,
  y: 0.25 + i * 0.5,
  h: 0.5 + i,
}));

// Everything the character can stand on or bump into. Wrapped in a single
// StaticCollider so bvhecctrl builds one BVH from the merged geometry.
const CollidableWorld = () => (
  <StaticCollider>
    {/* Oversized so its rim sits past the fog's far plane — the edge fades
        into the horizon instead of reading as a floating quad. */}
    <mesh receiveShadow rotation-x={-Math.PI / 2}>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#3d4a55" />
    </mesh>

    {PILLARS.map((p) => (
      <mesh
        key={`pillar-${p.x.toFixed(2)}-${p.z.toFixed(2)}`}
        castShadow
        receiveShadow
        position={[p.x, 0.9, p.z]}
      >
        <boxGeometry args={[1.2, 1.8, 1.2]} />
        <meshStandardMaterial color="#5b6c7a" />
      </mesh>
    ))}

    {STEPS.map((s) => (
      <mesh
        key={`step-${s.x.toFixed(2)}`}
        castShadow
        receiveShadow
        position={[s.x, s.y, -4]}
      >
        <boxGeometry args={[1.4, s.h, 3]} />
        <meshStandardMaterial color="#6b5b73" />
      </mesh>
    ))}

    {/* A ramp to walk up onto the platform. */}
    <mesh
      castShadow
      receiveShadow
      position={[6, 0.75, -7]}
      rotation-x={-Math.PI / 9}
    >
      <boxGeometry args={[4, 0.4, 6]} />
      <meshStandardMaterial color="#4a6a4f" roughness={1} />
    </mesh>
    <mesh castShadow receiveShadow position={[6, 1.25, -10.5]}>
      <boxGeometry args={[4, 2.5, 3]} />
      <meshStandardMaterial color="#4a6a4f" roughness={1} />
    </mesh>
  </StaticCollider>
);

// Chase camera that tracks the controller group from a fixed world-space
// offset (so the move axes stay stable) and looks at the character's chest.
const FollowCamera = ({ ecctrlRef }) => {
  const cameraRef = useRef();
  const pos = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const grp = ecctrlRef.current?.group;
    const cam = cameraRef.current;
    if (!grp || !cam) return;
    grp.getWorldPosition(pos.current);
    desired.current.set(pos.current.x, pos.current.y + 3.2, pos.current.z + 6.5);
    cam.position.lerp(desired.current, Math.min(1, dt * 5));
    cam.lookAt(pos.current.x, pos.current.y + 1.1, pos.current.z);
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

// Bridges bvhecctrl's animation status into our rig's pose so the avatar
// walks / runs / jumps in sync with the controller.
const AnimationBridge = () => {
  const animationStatus = useAnimationStore((s) => s.animationStatus);
  const setPose = useConfiguratorStore((s) => s.setPose);
  useEffect(() => {
    setPose(STATUS_TO_CLIP[animationStatus] || STATUS_TO_CLIP.IDLE);
  }, [animationStatus, setPose]);
  return null;
};

// Press R to respawn at the origin (handy after running off into the void).
const ResetControl = ({ ecctrlRef }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== "r") return;
      const grp = ecctrlRef.current?.group;
      if (!grp) return;
      grp.position.set(...SPAWN);
      ecctrlRef.current.setLinVel(new THREE.Vector3(0, 0, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ecctrlRef]);
  return null;
};

const PlatformerScene = () => {
  const gender = useConfiguratorStore((s) => s.gender);
  const ecctrlRef = useRef(null);

  return (
    <>
      <Decor />
      <SunFollower ecctrlRef={ecctrlRef} />
      <FollowCamera ecctrlRef={ecctrlRef} />
      <AnimationBridge />
      <ResetControl ecctrlRef={ecctrlRef} />

      <CollidableWorld />

      <KeyboardControls map={KEYBOARD_MAP}>
        <BVHEcctrl
          ref={ecctrlRef}
          position={SPAWN}
          colliderCapsuleArgs={[CAPSULE_RADIUS, CAPSULE_LENGTH, 4, 8]}
          floatHeight={FLOAT_HEIGHT}
          gravity={18}
          jumpVel={6.5}
          maxWalkSpeed={2.6}
          maxRunSpeed={5.5}
        >
          <group position={[0, MODEL_Y, 0]} rotation={[0, FACING_Y, 0]}>
            <Suspense fallback={null}>
              <StoreCharacterProvider>
                <Avatar key={gender} />
              </StoreCharacterProvider>
            </Suspense>
          </group>
        </BVHEcctrl>
      </KeyboardControls>
    </>
  );
};

const TOUCH_BTN_CAP = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "rgba(255,255,255,0.9)",
  backdropFilter: "blur(8px)",
};

const PlatformerView = () => {
  const setMode = useConfiguratorStore((s) => s.setMode);
  const setGesture = useConfiguratorStore((s) => s.setGesture);
  const introFinished = useConfiguratorStore((s) => s.introFinished);

  useEffect(() => {
    // Start from a clean idle; the AnimationBridge drives the pose from here.
    setMode(UI_MODES.CUSTOMIZE);
    // Defensive: make sure no leftover idle-juice gesture overrides the
    // controller-driven pose on this route.
    setGesture(null);
  }, [setMode, setGesture]);

  return (
    <PlayShell title="Platformer">
      <EngineCanvas
        shadows
        frameloop="always"
        camera={{ position: [0, 4, 8], fov: 50 }}
      >
        <PlatformerScene />
      </EngineCanvas>
      {!introFinished && <LoadingScreen />}
      <NoCharacterOverlay />

      {/* Desktop key hints */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-6 max-md:hidden">
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
          <span className="text-white/25">·</span>
          <span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white/90">
              Space
            </kbd>{" "}
            jump
          </span>
          <span className="text-white/25">·</span>
          <span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white/90">
              R
            </kbd>{" "}
            reset
          </span>
        </div>
      </div>

      {/* Touch controls (mobile only). Joystick + jump/run buttons feed the
          same controller through bvhecctrl's joystick/button stores. */}
      <div className="md:hidden">
        <Joystick
          joystickBaseStyle={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
          joystickKnobStyle={{ background: "rgba(255,255,255,0.85)" }}
        />
        <VirtualButton
          id="jump"
          label="JUMP"
          buttonWrapperStyle={{ right: "32px", bottom: "104px" }}
          buttonCapStyle={TOUCH_BTN_CAP}
        />
        <VirtualButton
          id="run"
          label="RUN"
          buttonWrapperStyle={{ right: "108px", bottom: "44px" }}
          buttonCapStyle={TOUCH_BTN_CAP}
        />
      </div>
    </PlayShell>
  );
};

export default PlatformerView;
