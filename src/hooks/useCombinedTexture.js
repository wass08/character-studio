import { useTexture } from "@react-three/drei";
import { useEffect, useState } from "react";
import * as THREE from "three";

export const useCombinedTexture = (imageUrls, baseColorHex) => {
  const textureMaps = useTexture(imageUrls);
  const [canvasTexture, setCanvasTexture] = useState(null);

  useEffect(() => {
    const maps = Array.isArray(textureMaps) ? textureMaps : [textureMaps];

    // A plain skin colour should stay on material.color. Baking it into a 1px
    // sRGB texture changes the colour-management path and makes the same hex
    // value render visibly darker once this async effect completes.
    if (maps.length === 0) {
      setCanvasTexture(null);
      return;
    }

    const firstImg = maps[0]?.image || maps[0]?.source?.data;

    const canvas = document.createElement("canvas");
    canvas.width = firstImg?.width || 1;
    canvas.height = firstImg?.height || 1;
    const ctx = canvas.getContext("2d");

    // Match the Blender authoring setup: a skin-colour shader underneath,
    // then the image texture mixed over it by the texture alpha. Three's
    // material.map is multiplied by material.color, so callers should set the
    // material color to white when this composite map is present.
    ctx.fillStyle = baseColorHex || "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    maps.forEach((map) => {
      const img = map?.image || map?.source?.data;
      if (img) {
        ctx.drawImage(img, 0, 0);
      }
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;

    setCanvasTexture(texture);

    // Do not dispose in the dependency cleanup. WebGPU can still have a render
    // pass in flight against the previous material map for one frame during a
    // makeup/skin-colour swap; disposing or nulling that map can trip internal
    // texture-transform reads. Makeup and character swaps are infrequent
    // enough that avoiding the crash is the better trade-off here.
  }, [textureMaps, baseColorHex]);

  return canvasTexture;
};
