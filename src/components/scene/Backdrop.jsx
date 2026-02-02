import React from "react";
import { useGLTF } from "@react-three/drei";

export default function Model(props) {
  const { nodes } = useGLTF("/models/Backdrop.glb");

  return (
    <group {...props} dispose={null}>
      <mesh
        receiveShadow
        geometry={nodes.Plane002.geometry}
        position={[0, -0.01, -1]}
        scale={[2.898, 1, 1]}
      >
        <meshStandardMaterial color="#D3C9A9" roughness={1} />
      </mesh>
    </group>
  );
}

useGLTF.preload("/models/Backdrop.glb");
