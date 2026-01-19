"use client";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { Leva } from "leva";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import Avatar from "./Avatar";
import { CameraManager } from "./CameraManager";

const SceneContent = () => {
  const gl = useThree((state) => state.gl);
  const setScreenshot = useConfiguratorStore((state) => state.setScreenshot);

  useEffect(() => {
    const screenshot = () => {
      const overlayCanvas = document.createElement("canvas");
      overlayCanvas.width = gl.domElement.width;
      overlayCanvas.height = gl.domElement.height;
      const overlayCtx = overlayCanvas.getContext("2d");

      if (!overlayCtx) return;

      overlayCtx.drawImage(gl.domElement, 0, 0);

      const logo = new Image();
      logo.src = "/images/wawasensei-white.png";
      logo.crossOrigin = "anonymous";
      logo.onload = () => {
        const logoWidth = 765 / 4;
        const logoHeight = 370 / 4;
        const x = overlayCanvas.width - logoWidth - 42;
        const y = overlayCanvas.height - logoHeight - 42;
        overlayCtx.drawImage(logo, x, y, logoWidth, logoHeight);

        const link = document.createElement("a");
        const date = new Date();
        link.setAttribute(
          "download",
          `Avatar_${date.toISOString().split("T")[0]}.png`,
        );
        link.setAttribute("href", overlayCanvas.toDataURL("image/png"));
        link.click();
      };
    };

    setScreenshot(screenshot);
  }, [gl, setScreenshot]);

  return (
    <>
      <Leva hidden />
      <CameraManager />
      <color attach="background" args={["#424242"]} />
      <Environment
        background={false}
        environmentIntensity={1.5}
        environmentRotation={[0, Math.PI / 2, 0]}
        preset="city"
      />
      <ambientLight intensity={0.25} />
      <Avatar />
    </>
  );
};

const Scene = () => {
  return (
    <Canvas gl={{ preserveDrawingBuffer: true }}>
      <SceneContent />
    </Canvas>
  );
};

export default Scene;
