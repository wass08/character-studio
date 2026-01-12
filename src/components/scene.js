"use client";
import { CameraControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

const Scene = () => {
  return (
    <Canvas>
      <CameraControls />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshNormalMaterial />
      </mesh>
    </Canvas>
  );
};

export default Scene;
