import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";

export default function Model(props) {
  const { nodes, materials } = useGLTF("/models/Backdrop.glb");
  return (
    <group {...props} dispose={null}>
      <mesh
        receiveShadow
        geometry={nodes.Plane002.geometry}
        material={materials["Eye White.001"]}
        position={[0, 0, -1]}
        scale={[2.898, 1, 1]}
      />
    </group>
  );
}

useGLTF.preload("/models/Backdrop.glb");
