import { useEffect, useState } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

export const useCombinedTexture = (imageUrls, baseColorHex) => {
  const textureMaps = useTexture(imageUrls);
  const [canvasTexture, setCanvasTexture] = useState(null);

  useEffect(() => {
    if (
      !textureMaps ||
      (Array.isArray(textureMaps) && textureMaps.length === 0)
    ) {
      setCanvasTexture(null);
      return;
    }

    const maps = Array.isArray(textureMaps) ? textureMaps : [textureMaps];

    const firstImg = maps[0].image || maps[0].source?.data;
    if (!firstImg) return;

    const canvas = document.createElement("canvas");
    canvas.width = firstImg.width;
    canvas.height = firstImg.height;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    maps.forEach((map) => {
      const img = map.image || map.source?.data;
      if (img) {
        ctx.drawImage(img, 0, 0);
      }
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;

    setCanvasTexture(texture);

    return () => texture.dispose();
  }, [textureMaps, baseColorHex]);

  return canvasTexture;
};
