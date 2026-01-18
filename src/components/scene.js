"use client";
import {
  CameraControls,
  Environment,
  PerspectiveCamera,
} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import Avatar from "./scene/Avatar";
import { useRef } from "react";
import { CameraManager } from "./scene/CameraManager";
import { Leva } from "leva";

const Scene = () => {
  const camera = useRef();

  return (
    <Canvas>
      <Leva hidden />
      <CameraManager />

      <color attach="background" args={["#424242"]} />
      <Environment
        background={false}
        environmentIntensity={1.5}
        environmentRotation={[0, Math.PI / 2, 0]}
        preset="city"
      />

      {/* <directionalLight intensity={2.5} /> */}
      <ambientLight intensity={0.25} />
      <Avatar />
    </Canvas>
  );
};

export default Scene;
