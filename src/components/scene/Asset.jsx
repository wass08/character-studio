import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";

export const Asset = ({ url, categoryName, skeleton }) => {
  const { scene } = useGLTF(url);

  const customization = useConfiguratorStore((state) => state.customization);
  const skin = useConfiguratorStore((state) => state.skin);

  const assetcolor = customization[categoryName].color;
  const registerMorphs = useConfiguratorStore((state) => state.registerMorphs);
  const morphValues = useConfiguratorStore((state) => state.morphValues);
  const meshRefs = useRef([]);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        if (child.material?.name.includes("Color_")) {
          child.material.color.set(assetcolor);
        }
      }
    });
  }, [assetcolor, scene]);

  const attachedItems = useMemo(() => {
    const items = [];
    scene.traverse((child) => {
      if (child.isMesh) {
        items.push({
          geometry: child.geometry,
          material: child.material.name.includes("Skin_")
            ? skin
            : child.material,
          morphTargetDictionary: child.morphTargetDictionary,
          morphTargetInfluences: child.morphTargetInfluences,
        });
      }
    });
    return items;
  }, [scene]);

  useEffect(() => {
    const allKeys = [];
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        allKeys.push(...Object.keys(child.morphTargetDictionary));
      }
    });

    if (allKeys.length > 0) {
      registerMorphs(allKeys);
    }
  }, [scene, registerMorphs]);

  useEffect(() => {
    meshRefs.current.forEach((mesh) => {
      if (!mesh || !mesh.morphTargetDictionary) return;

      Object.entries(morphValues).forEach(([key, value]) => {
        const index = mesh.morphTargetDictionary[key];
        if (index !== undefined) {
          mesh.morphTargetInfluences[index] = value;
        }
      });
    });
  }, [morphValues, attachedItems]);

  return attachedItems.map((item, index) => (
    <skinnedMesh
      key={index}
      ref={(el) => (meshRefs.current[index] = el)}
      skeleton={skeleton}
      geometry={item.geometry}
      material={item.material}
      morphTargetDictionary={item.morphTargetDictionary}
      morphTargetInfluences={item.morphTargetInfluences}
      castShadow
      receiveShadow
    />
  ));
};
