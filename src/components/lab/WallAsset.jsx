"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { pb } from "@/stores/useConfiguratorStore";

function urlOf(asset) {
  if (!asset) return null;
  if (asset.r2Url) return asset.r2Url;
  if (asset.url) return pb.files.getURL(asset, asset.url);
  return null;
}

function cloneWallMaterial(material) {
  if (!material) return material;
  if (Array.isArray(material)) return material.map(cloneWallMaterial);
  if (material.type === "MeshPhysicalMaterial") {
    const downgraded = new THREE.MeshStandardMaterial();
    downgraded.copy(material);
    downgraded.needsUpdate = true;
    return downgraded;
  }
  return material.clone ? material.clone() : material;
}

export default function WallAsset({ entry, skeleton, skinMaterial }) {
  const asset = entry?.asset;
  const url = urlOf(asset);

  if (!url) return null;
  if (/\.(png|jpg|jpeg|webp)$/i.test(url)) return null;

  return (
    <WallAssetGLB
      url={url}
      entry={entry}
      skeleton={skeleton}
      skinMaterial={skinMaterial}
    />
  );
}

function WallAssetGLB({ url, entry, skeleton, skinMaterial }) {
  const { scene } = useGLTF(url);
  const colors = entry?.colors || {};
  const fallbackColor = entry?.color;
  const meshRefs = useRef([]);

  const items = useMemo(() => {
    const out = [];

    scene.traverse((child) => {
      if (child.isMesh && !child.name?.includes("Plane002")) {
        const matName = child.material?.name || "";
        const isSkin = matName.toLowerCase().includes("skin");
        out.push({
          geometry: child.geometry,
          material: isSkin ? skinMaterial : cloneWallMaterial(child.material),
          morphTargetDictionary: child.morphTargetDictionary,
          morphTargetInfluences: child.morphTargetInfluences,
        });
      }
    });

    return out;
  }, [scene, skinMaterial]);

  useEffect(() => {
    items.forEach((item) => {
      const matName = item.material?.name;
      if (!matName?.includes("Color")) return;

      const target = colors[matName] || fallbackColor;
      if (target) item.material.color?.set(target);
    });
  }, [items, colors, fallbackColor]);

  useEffect(
    () => () => {
      items.forEach((item) => {
        if (item.material && item.material !== skinMaterial) {
          item.material.dispose?.();
        }
      });
    },
    [items, skinMaterial],
  );

  return items.map((item, index) => (
    // geometry.uuid is stable per source-scene mesh, unlike the array
    // index — keys this map across re-renders even if items reorders.
    <skinnedMesh
      key={item.geometry.uuid}
      ref={(el) => {
        meshRefs.current[index] = el;
      }}
      skeleton={skeleton}
      geometry={item.geometry}
      material={item.material}
      morphTargetDictionary={item.morphTargetDictionary}
      morphTargetInfluences={item.morphTargetInfluences}
      frustumCulled={false}
    />
  ));
}
