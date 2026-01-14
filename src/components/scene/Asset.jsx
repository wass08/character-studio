import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";

export const Asset = ({ url, categoryName, skeleton }) => {
  const { scene } = useGLTF(url);

  const customization = useConfiguratorStore((state) => state.customization);
  const skin = useConfiguratorStore((state) => state.skin);

  const assetcolor = customization[categoryName].color;

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
        });
      }
    });
    return items;
  }, [scene]);

  return attachedItems.map((item, index) => (
    <skinnedMesh
      key={index}
      skeleton={skeleton}
      geometry={item.geometry}
      material={item.material}
      castShadow
      receiveShadow
    />
  ));
};
