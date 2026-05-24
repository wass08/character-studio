"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { pb } from "@/stores/useConfiguratorStore";

function urlOf(asset) {
  if (!asset) return null;
  if (asset.r2Url) return asset.r2Url;
  if (asset.url) return pb.files.getURL(asset, asset.url);
  return null;
}

export default function WallAsset({ entry, skeleton }) {
  const asset = entry?.asset;
  const url = urlOf(asset);

  if (!url) return null;
  if (/\.(png|jpg|jpeg|webp)$/i.test(url)) return null;

  return <WallAssetGLB url={url} entry={entry} skeleton={skeleton} />;
}

function WallAssetGLB({ url, entry, skeleton }) {
  const { scene } = useGLTF(url);
  const colors = entry?.colors || {};
  const fallbackColor = entry?.color;
  const meshRefs = useRef([]);

  const items = useMemo(() => {
    const out = [];

    scene.traverse((child) => {
      if (child.isMesh && !child.name?.includes("Plane002")) {
        out.push({
          geometry: child.geometry,
          material: child.material,
          morphTargetDictionary: child.morphTargetDictionary,
          morphTargetInfluences: child.morphTargetInfluences,
        });
      }
    });

    return out;
  }, [scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if (!child.isMesh) return;

      const matName = child.material?.name;
      if (!matName?.includes("Color")) return;

      const target = colors[matName] || fallbackColor;
      if (target) child.material.color.set(target);
    });
  }, [scene, colors, fallbackColor]);

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
    />
  ));
}
