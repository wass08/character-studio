"use client";

import { Html } from "@react-three/drei";
import { Suspense, useMemo, useState } from "react";
import { EngineCanvas } from "@/components/scene/EngineCanvas";
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

const HERO_SLOTS = [
  { x: -3.55, z: -1.5, scale: 0.92, rotationY: 0.7 },
  { x: -2.45, z: 0.38, scale: 1.04, rotationY: -0.34 },
  { x: -1.25, z: -0.86, scale: 0.96, rotationY: 0.22 },
  { x: -0.12, z: 0.82, scale: 1.08, rotationY: -0.16 },
  { x: 1.02, z: -1.42, scale: 0.92, rotationY: 0.36 },
  { x: 2.08, z: 0.68, scale: 1.06, rotationY: -0.48 },
  { x: 3.18, z: -0.48, scale: 0.98, rotationY: 0.62 },
  { x: 4.34, z: -1.16, scale: 0.98, rotationY: -0.82 },
];

const WALL_CAMERA = { position: [0, 1.45, 10.2], fov: 30 };
const HERO_CAMERA = { position: [0.72, 1.32, 7.05], fov: 34 };

function creatorName(character) {
  return getUserDisplayName(character.expand?.user, "Creator");
}

export default function WallScene({
  characters,
  assetsById,
  variant = "wall",
}) {
  const [hovered, setHovered] = useState(null);
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
        camera.lookAt(0, 0.82, 0);
        camera.updateProjectionMatrix();
      }}
    >
      {!compact && <color attach="background" args={["#101018"]} />}
      {compact && <fog attach="fog" args={["#0b0a0d", 6.8, 10.6]} />}
      <hemisphereLight args={["#fff4ec", "#2f3140", compact ? 0.58 : 0.72]} />
      <ambientLight intensity={compact ? 0.26 : 0.42} />
      <directionalLight
        position={[-3, 5, 4]}
        intensity={compact ? 1.8 : 1.45}
        color="#ffebe3"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={16}
        shadow-camera-left={-6.2}
        shadow-camera-right={6.2}
        shadow-camera-top={5.8}
        shadow-camera-bottom={-4.2}
        shadow-bias={-0.0001}
        shadow-normalBias={0.06}
      />
      <directionalLight position={[3, 4, -2]} intensity={0.9} color="#cfd4ff" />
      <directionalLight
        position={[0, 2.4, 5]}
        intensity={0.45}
        color="#ffffff"
      />

      {compact && (
        <mesh position={[0.9, 1.24, -2.32]}>
          <planeGeometry args={[10.6, 3.3]} />
          <meshBasicMaterial
            color="#17131a"
            depthWrite={false}
            opacity={0.34}
            transparent
          />
        </mesh>
      )}

      <mesh rotation-x={-Math.PI / 2} position-y={-0.025} receiveShadow>
        <planeGeometry args={compact ? [11.8, 5.8] : [9.6, 6.8]} />
        <meshStandardMaterial
          color={compact ? "#242128" : "#1c1d2a"}
          metalness={0}
          opacity={compact ? 0.78 : 1}
          roughness={0.92}
          transparent={compact}
        />
      </mesh>

      {visibleCharacters.map((character, index) => {
        const slot = slots[index % slots.length];

        return (
          <Suspense key={character.id} fallback={null}>
            <WallCharacter
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
              motionMode={compact ? "hero" : "wall"}
            />
          </Suspense>
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
