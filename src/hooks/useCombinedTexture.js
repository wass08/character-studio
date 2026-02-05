import { useEffect, useState } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

export const useCombinedTexture = (imageUrl, baseColorHex) => {
  const textureMap = useTexture(imageUrl);
  const [canvasTexture, setCanvasTexture] = useState(null);

  useEffect(() => {
    const imgElement = textureMap.image || textureMap.source?.data;
    if (!imgElement) return;

    const canvas = document.createElement("canvas");
    canvas.width = imgElement.width;
    canvas.height = imgElement.height;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = baseColorHex || "#f5c6a5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(imgElement, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;

    setCanvasTexture(texture);

    return () => texture.dispose();
  }, [textureMap, baseColorHex]);

  return canvasTexture;
};
