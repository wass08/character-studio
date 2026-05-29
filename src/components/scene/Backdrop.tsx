import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";
import {
  BACKDROP_PRESETS,
  DEFAULT_BACKDROP,
  type BackdropPresetId,
} from "./backdropPresets";

type GroupProps = ThreeElements["group"];

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

type BackdropProps = GroupProps & { preset?: BackdropPresetId };

export default function Backdrop({
  preset = DEFAULT_BACKDROP,
  ...props
}: BackdropProps) {
  const { nodes, materials } = useGLTF(
    "/models/Backdrop.glb",
  ) as unknown as BackdropGLTF;
  const floorColor = BACKDROP_PRESETS[preset]?.floor ?? BACKDROP_PRESETS[DEFAULT_BACKDROP].floor;
  return (
    // Named so the thumbnail capture can hide it without traversing
    // by material/geometry.
    <group name="character-studio-backdrop" {...props} dispose={null}>
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
        <meshStandardMaterial roughness={1} color={floorColor} />
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
