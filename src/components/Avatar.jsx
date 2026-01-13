import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";

export default function Model(props) {
  const { nodes, materials } = useGLTF("/models/Armature.glb");
  console.log(nodes);
  return (
    <group {...props} dispose={null}>
      <group position={[0, 0, 0.098]} rotation={[Math.PI, 0, Math.PI]}>
        <primitive object={nodes.root} />
        <primitive object={nodes["MCH-eyes_parent"]} />
      </group>
    </group>
  );
}

useGLTF.preload("/models/Armature.glb");
