import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type {
  BufferGeometry,
  Material,
  Mesh,
  Skeleton,
  SkinnedMesh,
} from "three";
import { useCharacter } from "./CharacterContext";

type AssetProps = {
  url: string;
  categoryName: string;
  skeleton: Skeleton;
};

type AttachedItem = {
  geometry: BufferGeometry;
  material: Material | null;
  morphTargetDictionary?: { [key: string]: number };
  morphTargetInfluences?: number[];
};

// Type guards. drei's `useGLTF` widens scene children to `Object3D`; we
// narrow to mesh-bearing nodes for the colour and morph passes.
function isMesh(obj: object): obj is Mesh {
  return (obj as Mesh).isMesh === true;
}

export const Asset = ({ url, categoryName, skeleton }: AssetProps) => {
  const { scene } = useGLTF(url);

  const {
    customization,
    lockedGroups,
    skin,
    updateColor,
    registerMorphs,
    registerColorSlots,
    morphValues,
  } = useCharacter();

  const assetColor = customization[categoryName]?.color ?? null;
  const assetColors = customization[categoryName]?.colors ?? {};

  const meshRefs = useRef<Array<SkinnedMesh | null>>([]);

  useEffect(() => {
    scene.traverse((child) => {
      if (!isMesh(child)) return;
      const material = child.material as Material & {
        name?: string;
        color?: { set: (value: string) => void };
      };
      if (!material?.name?.includes("Color")) return;
      const targetColor = assetColors[material.name] || assetColor;
      if (targetColor) {
        material.color?.set(targetColor);
      }
    });
  }, [assetColor, assetColors, scene]);

  const attachedItems = useMemo<AttachedItem[]>(() => {
    const items: AttachedItem[] = [];
    scene.traverse((child) => {
      if (!isMesh(child)) return;
      if (child.name.includes("Plane002")) return;
      const material = child.material as (Material & { name?: string }) | null;
      const isSkin = material?.name?.toLowerCase().includes("skin") ?? false;
      items.push({
        geometry: child.geometry,
        material: isSkin ? skin : (material ?? null),
        morphTargetDictionary: child.morphTargetDictionary,
        morphTargetInfluences: child.morphTargetInfluences,
      });
    });
    return items;
    // skin is the singleton MeshStandardMaterial from the character context;
    // its identity changes only when the gender swaps. assetColors is excluded
    // because the colour update loop above already mutates the GLTF materials.
  }, [scene, skin]);

  useEffect(() => {
    const newDetectedSlots: string[] = [];
    const initialColors: Record<string, string> = {};

    scene.traverse((child) => {
      if (!isMesh(child)) return;
      const material = child.material as Material & {
        name?: string;
        color?: { getHexString: () => string };
      };
      if (!material?.name?.includes("Color_")) return;
      const slotName = material.name;
      newDetectedSlots.push(slotName);

      if (!assetColors[slotName] && !assetColor) {
        const hex = `#${material.color?.getHexString() ?? "ffffff"}`;
        initialColors[slotName] = hex;
      }
    });

    registerColorSlots(categoryName, [...new Set(newDetectedSlots)]);

    if (Object.keys(initialColors).length > 0) {
      Object.entries(initialColors).forEach(([slot, hex]) => {
        if (!customization[categoryName]?.colors?.[slot]) {
          updateColor(categoryName, hex, slot);
        }
      });
    }

    return () => registerColorSlots(categoryName, []);
    // Matches the prior dependency list — registerColorSlots itself is stable.
  }, [scene, categoryName, updateColor, registerColorSlots]);

  useEffect(() => {
    const allKeys: string[] = [];
    scene.traverse((child) => {
      if (!isMesh(child)) return;
      if (child.morphTargetDictionary) {
        allKeys.push(...Object.keys(child.morphTargetDictionary));
      }
    });

    registerMorphs(categoryName, [...new Set(allKeys)]);

    return () => registerMorphs(categoryName, []);
  }, [scene, categoryName, registerMorphs]);

  useEffect(() => {
    meshRefs.current.forEach((mesh) => {
      if (!mesh || !mesh.morphTargetDictionary) return;
      const influences = mesh.morphTargetInfluences;
      if (!influences) return;
      Object.entries(morphValues).forEach(([key, value]) => {
        const index = mesh.morphTargetDictionary?.[key];
        if (index !== undefined) {
          influences[index] = value;
        }
      });
    });
  }, [morphValues, attachedItems]);

  if (lockedGroups[categoryName]) {
    return null;
  }

  return attachedItems.map((item, index) => (
    <skinnedMesh
      key={`${url}-${index}`}
      ref={(el) => {
        meshRefs.current[index] = el;
      }}
      skeleton={skeleton}
      geometry={item.geometry}
      material={item.material ?? undefined}
      morphTargetDictionary={item.morphTargetDictionary}
      morphTargetInfluences={item.morphTargetInfluences}
      castShadow
      receiveShadow
    />
  ));
};
