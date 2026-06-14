"use client";

import { Html } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
  { x: -3.25, z: 0.24, scale: 1.0, rotationY: 0.72 },
  { x: -2.15, z: -0.82, scale: 1.16, rotationY: -0.28 },
  { x: -1.05, z: 0.05, scale: 1.04, rotationY: 0.2 },
  { x: 0.04, z: -0.96, scale: 1.2, rotationY: -0.14 },
  { x: 1.16, z: -0.18, scale: 1.08, rotationY: 0.34 },
  { x: 2.2, z: -0.72, scale: 1.16, rotationY: -0.46 },
  { x: 3.18, z: 0.05, scale: 1.04, rotationY: 0.62 },
  { x: 4.02, z: -0.55, scale: 1.1, rotationY: -0.82 },
];

const WALL_CAMERA = { position: [0, 1.45, 10.2], fov: 30 };
const HERO_CAMERA = { position: [0.6, 1.3, 7.2], fov: 34 };

function creatorName(character) {
  return getUserDisplayName(character.expand?.user, "Creator");
}

export default function WallScene({
  characters,
  assetsById,
  variant = "wall",
}) {
  const [hovered, setHovered] = useState(null);
  const [readyIds, setReadyIds] = useState(() => new Set());
  const compact = variant === "hero";
  const slots = compact ? HERO_SLOTS : WALL_SLOTS;
  const camera = compact ? HERO_CAMERA : WALL_CAMERA;
  const maxCharacters = compact ? HERO_SLOTS.length : MAX_CHARACTERS;
  const visibleCharacters = useMemo(
    () => characters.slice(0, maxCharacters),
    [characters, maxCharacters],
  );
  const visibleCharacterKey = useMemo(
    () => visibleCharacters.map((character) => character.id).join("|"),
    [visibleCharacters],
  );
  const markCharacterReady = useCallback((id) => {
    setReadyIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    void visibleCharacterKey;
    setReadyIds(new Set());
  }, [visibleCharacterKey]);

  return (
    <EngineCanvas
      className="h-full w-full"
      shadows={false}
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
      <hemisphereLight args={["#fff4ec", "#33344a", 0.72]} />
      <ambientLight intensity={0.42} />
      <directionalLight
        position={[-3, 5, 4]}
        intensity={1.45}
        color="#ffebe3"
      />
      <directionalLight position={[3, 4, -2]} intensity={0.9} color="#cfd4ff" />
      <directionalLight
        position={[0, 2.4, 5]}
        intensity={0.45}
        color="#ffffff"
      />

      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <circleGeometry args={[7.2, 64]} />
        <meshStandardMaterial
          color={compact ? "#242330" : "#1c1d2a"}
          opacity={compact ? 0.74 : 1}
          roughness={1}
          transparent={compact}
        />
      </mesh>

      <Suspense fallback={null}>
        {visibleCharacters.map((character, index) => {
          const slot = slots[index % slots.length];

          return (
            <WallCharacter
              key={character.id}
              character={character}
              assetsById={assetsById}
              index={index}
              position={[slot.x, 0, slot.z]}
              rotationY={slot.rotationY}
              scale={slot.scale}
              onHover={compact ? undefined : setHovered}
              onReady={markCharacterReady}
            />
          );
        })}
      </Suspense>

      {compact &&
        visibleCharacters.map((character, index) => {
          if (!readyIds.has(character.id)) return null;
          const slot = slots[index % slots.length];

          return (
            <group
              key={`${character.id}-label`}
              position={[slot.x, 2.08 * slot.scale, slot.z]}
            >
              <Html center distanceFactor={7.2}>
                <div className="min-w-24 whitespace-nowrap rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 text-center shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-md">
                  <div className="max-w-28 truncate text-[11px] font-semibold tracking-tight text-white">
                    {character.name || "Untitled"}
                  </div>
                  <div className="max-w-28 truncate text-[9px] font-medium tracking-tight text-white/50">
                    by {creatorName(character)}
                  </div>
                </div>
              </Html>
            </group>
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
