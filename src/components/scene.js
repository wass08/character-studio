"use client";
import {
  CameraControls,
  Environment,
  PerspectiveCamera,
} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import Avatar from "./scene/Avatar";
import { useRef } from "react";

const Scene = () => {
  const camera = useRef();

  return (
    <Canvas>
      <PerspectiveCamera
        ref={camera}
        makeDefault
        fov={35}
        position={[0, 1.2, -5]}
      />

      <CameraControls setTarget={[0, 3, 0]} />
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
