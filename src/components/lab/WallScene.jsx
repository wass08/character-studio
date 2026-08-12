"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  abs,
  float,
  floor,
  fract,
  length,
  max,
  mix,
  normalize,
  rand,
  smoothstep,
  uniform,
  uv,
  vec2,
  vec3,
} from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { EngineCanvas } from "@/components/scene/EngineCanvas";
import { EngineErrorBoundary } from "@/components/scene/EngineErrorBoundary";
import { getUserDisplayName } from "@/lib/userDisplay";
import { cn } from "@/lib/utils";
import WallCharacter from "./WallCharacter";

const MAX_CHARACTERS = 8;
const WALL_SLOTS = [
  { x: -2.9, z: -1.05, scale: 0.86, rotationY: 0.62 },
  { x: -1.75, z: 0.2, scale: 0.98, rotationY: -0.42 },
  { x: -0.55, z: -0.72, scale: 0.9, rotationY: 0.28 },
  { x: 0.65, z: 0.48, scale: 0.98, rotationY: -0.66 },
  { x: 1.9, z: -0.9, scale: 0.88, rotationY: 0.46 },
  { x: 3.0, z: 0.08, scale: 0.94, rotationY: -0.34 },
  { x: -3.7, z: 0.72, scale: 0.8, rotationY: 0.95 },
  { x: 3.75, z: 0.72, scale: 0.8, rotationY: -0.92 },
];

const HERO_CENTER = new THREE.Vector3(0.9, 0.86, 0);
const HERO_RING_RADIUS = 2.75;
const HERO_CAMERA_RADIUS = 7.25;
const HERO_CAMERA_HEIGHT = 1.62;
const HERO_FOCUS_OFFSET = 1.05;
const HERO_FOCUS_SECONDS = 2.5;
const HERO_TRAVEL_SECONDS = 1.35;
const HERO_TRANSITION_ZOOM_OUT = 1.75;
const HERO_TRANSITION_LIFT = 0.9;
const HERO_ANGLE_STEP = (Math.PI * 2) / 8;
const HERO_FOCUS_ANGLE_SPAN = HERO_ANGLE_STEP * 0.08;
const HERO_UP = new THREE.Vector3(0, 1, 0);
const HERO_SLOTS = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * Math.PI * 2;
  return {
    x: HERO_CENTER.x + Math.sin(angle) * HERO_RING_RADIUS,
    z: Math.cos(angle) * HERO_RING_RADIUS,
    scale: index % 2 === 0 ? 0.98 : 0.92,
    rotationY: angle,
  };
});

const WALL_CAMERA = { position: [0, 1.45, 10.2], fov: 30 };
const HERO_CAMERA = {
  position: [HERO_CENTER.x, HERO_CAMERA_HEIGHT, HERO_CAMERA_RADIUS],
  fov: 34,
};

const heroLookTarget = (cameraPosition) => {
  const viewDirection = HERO_CENTER.clone().sub(cameraPosition).normalize();
  const cameraRight = new THREE.Vector3()
    .crossVectors(viewDirection, HERO_UP)
    .normalize();
  return HERO_CENTER.clone().addScaledVector(cameraRight, -HERO_FOCUS_OFFSET);
};

const smootherStep = (value) =>
  value * value * value * (value * (value * 6 - 15) + 10);

const makeHeroGroundMaterial = () => {
  const transition = uniform(0);
  const focusDirection = uniform(new THREE.Vector2(0, 1));
  const point = uv().sub(vec2(0.5)).mul(2);
  const gridScale = 28;
  const gridPoint = point.mul(gridScale);
  const cellId = floor(gridPoint);
  const cellUv = fract(gridPoint).sub(0.5);
  const cellCenter = cellId.add(0.5).div(gridScale);
  const radius = length(cellCenter);

  const cellEdge = max(abs(cellUv.x), abs(cellUv.y));
  const squareCore = float(1).sub(smoothstep(0.22, 0.3, cellEdge));
  const squareGlow = float(1).sub(smoothstep(0.28, 0.43, cellEdge));
  const squareBloom = float(1).sub(smoothstep(0.38, 0.5, cellEdge));
  const ring = smoothstep(0.64, 0.72, radius).mul(
    float(1).sub(smoothstep(0.9, 0.98, radius)),
  );
  const noise = rand(cellId);
  const direction = normalize(cellCenter);
  const focus = smoothstep(0.78, 0.985, direction.dot(focusDirection));
  const litCell = focus
    .mul(float(0.82).add(noise.mul(0.18)))
    .mul(float(0.72).add(transition.mul(0.24)));
  // Three feathered additive layers create a stable shader-native bloom: a
  // crisp cell, a close glow, and a wider halo. Nothing changes randomly over
  // time; the only animation is the focus sector following the camera.
  const alpha = ring.mul(
    squareBloom
      .mul(float(0.004).add(litCell.mul(0.11)))
      .add(squareGlow.mul(float(0.006).add(litCell.mul(0.2))))
      .add(squareCore.mul(float(0.008).add(litCell.mul(0.72)))),
  );

  const material = new MeshBasicNodeMaterial();
  material.colorNode = mix(
    vec3(1.35, 0.56, 0.26),
    vec3(0.46, 0.72, 1.4),
    transition.mul(0.76).add(noise.mul(0.08)),
  );
  material.opacityNode = alpha;
  material.transparent = true;
  material.depthWrite = false;
  material.blending = THREE.AdditiveBlending;
  material.side = THREE.DoubleSide;
  material.toneMapped = false;

  return { focusDirection, material, transition };
};

const HeroCameraOrbit = ({ cameraAngleRef }) => {
  const camera = useThree((state) => state.camera);
  const angle = useRef(0);
  const stopAngle = useRef(0);
  const phaseElapsed = useRef(0);
  const desired = useRef(new THREE.Vector3());
  const viewDirection = useRef(new THREE.Vector3());
  const cameraRight = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const featuredTarget = useRef(new THREE.Vector3());
  const warmKey = useRef();
  const coolRim = useRef();
  const lightTarget = useRef(new THREE.Object3D());
  const reducedMotion = useRef(false);
  const groundMaterial = useMemo(() => makeHeroGroundMaterial(), []);

  useEffect(
    () => () => {
      groundMaterial.material.dispose();
    },
    [groundMaterial],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedMotion.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useFrame((_, delta) => {
    // Drift slowly through each portrait, then accelerate across the larger
    // gap. The camera never parks, but the long focus phase feels composed.
    let travelProgress = 0;
    if (!reducedMotion.current) {
      const cycleSeconds = HERO_FOCUS_SECONDS + HERO_TRAVEL_SECONDS;
      phaseElapsed.current += Math.min(delta, 0.05);
      while (phaseElapsed.current >= cycleSeconds) {
        phaseElapsed.current -= cycleSeconds;
        stopAngle.current =
          (stopAngle.current + HERO_ANGLE_STEP) % (Math.PI * 2);
      }

      if (phaseElapsed.current < HERO_FOCUS_SECONDS) {
        const focusProgress = phaseElapsed.current / HERO_FOCUS_SECONDS;
        angle.current =
          stopAngle.current -
          HERO_FOCUS_ANGLE_SPAN / 2 +
          smootherStep(focusProgress) * HERO_FOCUS_ANGLE_SPAN;
      } else {
        travelProgress = Math.max(
          0,
          Math.min(
            1,
            (phaseElapsed.current - HERO_FOCUS_SECONDS) / HERO_TRAVEL_SECONDS,
          ),
        );
        angle.current =
          stopAngle.current +
          HERO_FOCUS_ANGLE_SPAN / 2 +
          smootherStep(travelProgress) *
            (HERO_ANGLE_STEP - HERO_FOCUS_ANGLE_SPAN);
      }
    }
    const transitionPulse = Math.sin(Math.PI * smootherStep(travelProgress));
    const cameraRadius =
      HERO_CAMERA_RADIUS + transitionPulse * HERO_TRANSITION_ZOOM_OUT;
    desired.current.set(
      HERO_CENTER.x + Math.sin(angle.current) * cameraRadius,
      HERO_CAMERA_HEIGHT + transitionPulse * HERO_TRANSITION_LIFT,
      Math.cos(angle.current) * cameraRadius,
    );
    camera.position.lerp(desired.current, Math.min(1, delta * 2.6));

    // Aim just to the screen-left of the ring centre so the featured
    // character sits in the open right half of the marketing composition.
    viewDirection.current.copy(HERO_CENTER).sub(camera.position).normalize();
    cameraRight.current
      .crossVectors(viewDirection.current, HERO_UP)
      .normalize();
    lookTarget.current
      .copy(HERO_CENTER)
      .addScaledVector(cameraRight.current, -HERO_FOCUS_OFFSET);
    camera.lookAt(lookTarget.current);

    // A warm frontal key settles on the featured character. During travel it
    // gives way to a cooler rear edge, then returns as the next portrait lands.
    // Camera smoothing intentionally trails the desired orbit. Lighting from
    // the desired angle gets ahead of the visible portrait, so derive both
    // the active slot and shader sweep from the camera's real position.
    const cameraAngle = Math.atan2(
      camera.position.x - HERO_CENTER.x,
      camera.position.z - HERO_CENTER.z,
    );
    cameraAngleRef.current = cameraAngle;
    const featuredAngle =
      Math.round(cameraAngle / HERO_ANGLE_STEP) * HERO_ANGLE_STEP;
    featuredTarget.current.set(
      HERO_CENTER.x + Math.sin(featuredAngle) * HERO_RING_RADIUS,
      1.15,
      Math.cos(featuredAngle) * HERO_RING_RADIUS,
    );
    lightTarget.current.position.copy(featuredTarget.current);
    lightTarget.current.updateMatrix();
    lightTarget.current.updateMatrixWorld(true);
    if (warmKey.current) {
      warmKey.current.position.copy(camera.position);
      warmKey.current.position.y += 2.5;
      warmKey.current.intensity = THREE.MathUtils.lerp(
        110,
        42,
        transitionPulse,
      );
    }
    if (coolRim.current) {
      coolRim.current.position
        .copy(featuredTarget.current)
        .addScaledVector(viewDirection.current, 3.6);
      coolRim.current.position.y += 2.1;
      coolRim.current.intensity = THREE.MathUtils.lerp(4, 22, transitionPulse);
    }
    groundMaterial.focusDirection.value.set(
      Math.sin(cameraAngle),
      // The plane is rotated -90° around X, so local shader Y maps to
      // negative world Z. Flip it here so the lit sector follows the camera.
      -Math.cos(cameraAngle),
    );
    groundMaterial.transition.value = transitionPulse;
  });

  return (
    <>
      <spotLight
        ref={warmKey}
        target={lightTarget.current}
        color="#ffd8bc"
        angle={0.19}
        penumbra={0.78}
        distance={8.5}
        decay={1.7}
      />
      <spotLight
        ref={coolRim}
        target={lightTarget.current}
        color="#aebcff"
        angle={0.24}
        penumbra={1}
        distance={8}
        decay={1.9}
      />
      <primitive object={lightTarget.current} />
      <mesh
        position={[HERO_CENTER.x, 0.012, 0]}
        rotation-x={-Math.PI / 2}
        renderOrder={2}
        material={groundMaterial.material}
      >
        <planeGeometry args={[7.2, 7.2, 1, 1]} />
      </mesh>
    </>
  );
};

function creatorName(character) {
  return getUserDisplayName(character.expand?.user, "Creator");
}

function WallCharacterSlot(props) {
  const { character } = props;
  const [bakeFailed, setBakeFailed] = useState(false);
  const bakeId = character.latestBake || "";

  const usingBake = Boolean(bakeId) && !bakeFailed;
  return (
    <EngineErrorBoundary
      key={usingBake ? `bake:${bakeId}` : `live:${character.id}`}
      label={`${usingBake ? "baked" : "live"}-wall-character:${character.id}`}
      resetKey={`${character.id}:${usingBake ? bakeId : "live"}`}
      onError={usingBake ? () => setBakeFailed(true) : undefined}
    >
      <Suspense fallback={null}>
        <WallCharacter {...props} forceLive={!usingBake} />
      </Suspense>
    </EngineErrorBoundary>
  );
}

// Radial alpha falloff for the hero floor: the disc melts into the page's
// CSS gradient instead of showing the hard rectangular plane edges that made
// the old floor read as a slab floating over the background.
function useRadialFadeTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.72)");
    gradient.addColorStop(0.62, "rgba(255,255,255,0.28)");
    gradient.addColorStop(0.85, "rgba(255,255,255,0.06)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    return texture;
  }, []);
}

export default function WallScene({
  characters,
  assetsById,
  variant = "wall",
}) {
  const [hovered, setHovered] = useState(null);
  const heroCameraAngleRef = useRef(0);
  const radialFade = useRadialFadeTexture();
  const compact = variant === "hero";
  const slots = compact ? HERO_SLOTS : WALL_SLOTS;
  const camera = compact ? HERO_CAMERA : WALL_CAMERA;
  const maxCharacters = compact ? HERO_SLOTS.length : MAX_CHARACTERS;
  const visibleCharacters = useMemo(
    () => characters.slice(0, maxCharacters),
    [characters, maxCharacters],
  );

  return (
    <EngineCanvas
      className="h-full w-full"
      shadows
      dpr={[1, 1.5]}
      camera={camera}
      onCreated={({ camera, gl }) => {
        if (compact) {
          gl.setClearColor?.("#000000", 0);
          gl.setClearAlpha?.(0);
        }
        camera.lookAt(
          compact
            ? heroLookTarget(camera.position)
            : new THREE.Vector3(0, 0.82, 0),
        );
        camera.updateProjectionMatrix();
      }}
    >
      {compact && <HeroCameraOrbit cameraAngleRef={heroCameraAngleRef} />}
      {!compact && <color attach="background" args={["#101018"]} />}
      {/* Fog tinted to the page gradient's mid tone so distant characters
          dissolve into the backdrop instead of a foreign near-black. */}
      {compact && <fog attach="fog" args={["#121015", 7.2, 11.4]} />}
      <hemisphereLight args={["#fff4ec", "#2f3140", compact ? 0.34 : 0.72]} />
      <ambientLight intensity={compact ? 0.12 : 0.42} />
      <directionalLight
        position={[-3, 5, 4]}
        intensity={compact ? 0.8 : 1.45}
        color="#ffebe3"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={16}
        shadow-camera-left={-6.2}
        shadow-camera-right={6.2}
        shadow-camera-top={5.8}
        shadow-camera-bottom={-4.2}
        shadow-bias={-0.0001}
        shadow-normalBias={0.06}
        shadow-radius={6}
      />
      <directionalLight
        position={[3, 4, -2]}
        intensity={compact ? 0.32 : 0.9}
        color="#cfd4ff"
      />
      <directionalLight
        position={[0, 2.4, 5]}
        intensity={compact ? 0.16 : 0.45}
        color="#ffffff"
      />

      {compact ? (
        // Soft-edged disc that fades to transparent — the page gradient shows
        // through, so there is no visible floor boundary anywhere. fog=false:
        // fog would re-tint the far half of the disc and reintroduce a visible
        // band against the page gradient; the alpha falloff does the fading.
        <mesh rotation-x={-Math.PI / 2} position-y={-0.025} receiveShadow>
          <circleGeometry args={[7.8, 48]} />
          <meshStandardMaterial
            color="#1a1620"
            metalness={0}
            roughness={0.96}
            transparent
            opacity={0.62}
            alphaMap={radialFade ?? undefined}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ) : (
        <mesh rotation-x={-Math.PI / 2} position-y={-0.025} receiveShadow>
          <planeGeometry args={[9.6, 6.8]} />
          <meshStandardMaterial
            color="#1c1d2a"
            metalness={0}
            roughness={0.92}
          />
        </mesh>
      )}

      {visibleCharacters.map((character, index) => {
        const slot = slots[index % slots.length];

        return (
          // One broken character (bad GLB, missing armature) must not take
          // down the whole hero canvas — isolate each slot.
          <WallCharacterSlot
            key={`${character.id}:${character.latestBake || "live"}`}
            character={character}
            assetsById={assetsById}
            index={index}
            position={[slot.x, 0, slot.z]}
            rotationY={slot.rotationY}
            scale={slot.scale}
            onHover={compact ? undefined : setHovered}
            label={
              compact
                ? {
                    name: character.name || "Untitled",
                    creator: creatorName(character),
                  }
                : null
            }
            carouselCameraAngleRef={compact ? heroCameraAngleRef : null}
            motionMode={compact ? "carousel" : "wall"}
          />
        );
      })}

      {hovered != null && (
        <group position={hovered.headWorldPos.toArray()}>
          <Html center distanceFactor={6}>
            <div
              className={cn(
                "whitespace-nowrap rounded-full bg-black/80 px-3 py-1 text-xs font-medium tracking-tight text-white ring-1 ring-white/15 backdrop-blur",
              )}
            >
              {hovered.name}
            </div>
          </Html>
        </group>
      )}
    </EngineCanvas>
  );
}
