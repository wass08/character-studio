import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GroupProps = ThreeElements["group"];

// Static dressing — stool + floor + plant — loaded from a single GLB.
// First file converted in the engine rewrite plan
// (plans/app-engine-rewrite.md). TS-only at this stage; TSL/WebGPU
// layer arrives in a follow-up hardware-verification session.
type BackdropGLTF = GLTF & {
  nodes: {
    Stool: Mesh;
    Plane002: Mesh;
    plant_26: Mesh;
  };
  materials: {
    "Wood.004": MeshStandardMaterial;
    "02___Default": MeshStandardMaterial;
  };
};

export default function Backdrop(props: GroupProps) {
  // useGLTF's return widens nodes/materials to index signatures; cast
  // through unknown is the standard narrow per the drei + R3F TS docs.
  const { nodes, materials } = useGLTF(
    "/models/Backdrop.glb",
  ) as unknown as BackdropGLTF;
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Stool.geometry}
        material={materials["Wood.004"]}
        position={[-0.9, -0.017, 1.463]}
        rotation={[Math.PI, 0, Math.PI]}
        scale={[1.127, 1.366, 1.127]}
      />
      <mesh
        receiveShadow
        position={[0, -0.017, 0]}
        geometry={nodes.Plane002.geometry}
      >
        <meshStandardMaterial roughness={1} color="#b0b0ff" />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.plant_26.geometry}
        material={materials["02___Default"]}
        position={[0.92, -0.017, 1.747]}
        scale={1.734}
      />
    </group>
  );
}

useGLTF.preload("/models/Backdrop.glb");
