import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";

export const Asset = ({ url, categoryName, skeleton }) => {
  const { scene } = useGLTF(url);

  const customization = useConfiguratorStore((state) => state.customization);
  const lockedGroups = useConfiguratorStore((state) => state.lockedGroups);
  const skin = useConfiguratorStore((state) => state.skin);

  const updateColor = useConfiguratorStore((state) => state.updateColor);
  const assetColor = customization[categoryName]?.color;
  const assetColors = customization[categoryName]?.colors || {};

  const skinColor =
    customization["Skin"]?.color || customization["skin"]?.color;

  const registerMorphs = useConfiguratorStore((state) => state.registerMorphs);
  const registerColorSlots = useConfiguratorStore(
    (state) => state.registerColorSlots,
  );
  const morphValues = useConfiguratorStore((state) => state.morphValues);
  const meshRefs = useRef([]);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        if (child.material?.name.includes("Color")) {
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
        const isSkin = child.material?.name.toLowerCase().includes("skin");

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
    const newDetectedSlots = [];
    const initialColors = {};

    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        if (child.material.name.includes("Color_")) {
          const slotName = child.material.name;
          newDetectedSlots.push(slotName);

          if (!assetColors[slotName] && !assetColor) {
            const hex = `#${child.material.color.getHexString()}`;
            initialColors[slotName] = hex;
          }
        }
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
  }, [scene, categoryName, updateColor]);

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

  if (lockedGroups[categoryName]) {
    return null;
  }

  return attachedItems.map((item, index) => (
    <skinnedMesh
      key={`${url}-${index}`}
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
