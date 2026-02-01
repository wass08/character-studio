import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";

export const Asset = ({ url, categoryName, skeleton }) => {
  const { scene } = useGLTF(url);

  const customization = useConfiguratorStore((state) => state.customization);
  const skin = useConfiguratorStore((state) => state.skin);

  const assetColor = customization[categoryName]?.color;
  const assetColors = customization[categoryName]?.colors || {};
  const skinColor = customization["skin"]?.color;

  const registerMorphs = useConfiguratorStore((state) => state.registerMorphs);
  const registerColorSlots = useConfiguratorStore(
    (state) => state.registerColorSlots,
  ); // Import this
  const morphValues = useConfiguratorStore((state) => state.morphValues);
  const meshRefs = useRef([]);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        if (child.material?.name.includes("Color_")) {
          const targetColor = assetColors[child.material.name] || assetColor;

          if (targetColor) {
            child.material.color.set(targetColor);
          }
        }
      }
    });
  }, [assetColor, assetColors, scene]);

  const attachedItems = useMemo(() => {
    const items = [];
    scene.traverse((child) => {
      if (child.isMesh) {
        const isSkin = child.material?.name.includes("Skin");

        items.push({
          geometry: child.geometry,
          material: isSkin ? skin : child.material,
          morphTargetDictionary: child.morphTargetDictionary,
          morphTargetInfluences: child.morphTargetInfluences,
        });
      }
    });
    return items;
  }, [scene, skin, skinColor]);

  useEffect(() => {
    const foundSlots = new Set();
    scene.traverse((child) => {
      if (child.isMesh && child.material?.name.includes("Color_")) {
        foundSlots.add(child.material.name);
      }
    });
    // Register unique slot names (e.g. ['Color_A', 'Color_B']) to the store
    registerColorSlots(categoryName, Array.from(foundSlots));

    // Cleanup: clear slots when unmounting
    return () => registerColorSlots(categoryName, []);
  }, [scene, categoryName, registerColorSlots]);

  useEffect(() => {
    const allKeys = [];
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        allKeys.push(...Object.keys(child.morphTargetDictionary));
      }
    });

    registerMorphs(categoryName, [...new Set(allKeys)]);

    return () => registerMorphs(categoryName, []);
  }, [scene, categoryName, registerMorphs]);

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
