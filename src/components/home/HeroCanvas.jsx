"use client";

import { Environment } from "@react-three/drei";
import Avatar from "@/components/scene/Avatar";
import { StoreCharacterProvider } from "@/components/scene/CharacterContext";
import { EngineCanvas } from "@/components/scene/EngineCanvas";

/**
 * The live 3D character on the homepage hero, split out so HeroStage can
 * load it through `next/dynamic` ({ ssr: false }). Keeping the engine
 * (three + three/webgpu + drei + Avatar) in its own async chunk lets the
 * marketing copy, header, and CTA paint immediately while the canvas
 * streams in afterward — instead of blocking first paint on ~1.6 MB of JS.
 */
const HeroCanvas = () => (
  <EngineCanvas
    dpr={[1, 1.5]}
    shadows={false}
    camera={{ position: [0, 1.05, -3.6], fov: 38 }}
    // R3F's default lookAt is origin (feet). Aim at chest height
    // so the head sits in the upper third of the frame.
    onCreated={({ camera }) => {
      camera.lookAt(0, 1.0, 0);
      camera.updateProjectionMatrix();
    }}
  >
    <color attach="background" args={["#1c1c2a"]} />
    <Environment
      background={false}
      environmentIntensity={0.55}
      environmentRotation={[0, Math.PI / 2, 0]}
      preset="city"
    />
    <ambientLight intensity={0.45} />
    <hemisphereLight args={["#fff4ec", "#33344a", 0.55]} />
    <directionalLight position={[-3, 5, -3]} intensity={1.2} color="#ffebe3" />
    <directionalLight position={[-5, 5, 5]} intensity={1.4} color="#ffebe3" />
    <directionalLight position={[0.8, 2, -4]} intensity={0.8} color="#fff2e7" />
    <StoreCharacterProvider>
      <Avatar />
    </StoreCharacterProvider>
  </EngineCanvas>
);

export default HeroCanvas;
