import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";
// <meshStandardMaterial color="#D3C9A9" roughness={1} />

export default function Model(props) {
  const { nodes, materials } = useGLTF("/models/Backdrop.glb");
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Stool.geometry}
        material={materials["Wood.004"]}
        position={[-0.87, 0, 1.763]}
        rotation={[Math.PI, 0, Math.PI]}
        scale={[1.127, 1.366, 1.127]}
      />
      <mesh
        castShadow
        receiveShadow
        position={[0, -0.017, 0]}
        geometry={nodes.Plane002.geometry}
        material={materials.Backdrop}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.plant_26.geometry}
        material={materials["02___Default"]}
        position={[0.92, 0, 1.647]}
        scale={1.734}
      />
    </group>
  );
}

useGLTF.preload("/models/Backdrop.glb");
