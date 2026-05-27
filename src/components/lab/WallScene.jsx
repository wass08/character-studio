"use client";

import { Html } from "@react-three/drei";
import { Suspense, useMemo, useState } from "react";
import { EngineCanvas } from "@/components/scene/EngineCanvas";
import { cn } from "@/lib/utils";
import WallCharacter from "./WallCharacter";

const MAX_CHARACTERS = 8;
const CHARACTER_SPACING = 1.6;

export default function WallScene({ characters, assetsById }) {
  const [hovered, setHovered] = useState(null);
  const visibleCharacters = useMemo(
    () => characters.slice(0, MAX_CHARACTERS),
    [characters],
  );
  const rowOffset = ((visibleCharacters.length - 1) * CHARACTER_SPACING) / 2;

  return (
    <EngineCanvas
      className="h-full w-full"
      shadows={false}
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.6, 7], fov: 35 }}
    >
      <color attach="background" args={["#101018"]} />
      <hemisphereLight args={["#fff4ec", "#33344a", 0.6]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-3, 5, 4]} intensity={1.6} color="#ffebe3" />
      <directionalLight position={[3, 4, -2]} intensity={0.8} color="#cfd4ff" />

      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <circleGeometry args={[12, 64]} />
        <meshStandardMaterial color="#1c1d2a" roughness={1} />
      </mesh>

      <Suspense fallback={null}>
        {visibleCharacters.map((character, index) => {
          const x = index * CHARACTER_SPACING - rowOffset;

          return (
            <WallCharacter
              key={character.id}
              character={character}
              assetsById={assetsById}
              index={index}
              position={[x, 0, 0]}
              onHover={setHovered}
            />
          );
        })}
      </Suspense>

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
