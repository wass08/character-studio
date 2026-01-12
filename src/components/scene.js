"use client";
import {
  CameraControls,
  Environment,
  PerspectiveCamera,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Avatar from "./Avatar";
import { useRef } from "react";

const Scene = () => {
  const camera = useRef();

  return (
    <Canvas>
      <PerspectiveCamera
        ref={camera}
        makeDefault
        fov={35}
        position={[0, 2.5, -10]}
      />

      <CameraControls />
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
