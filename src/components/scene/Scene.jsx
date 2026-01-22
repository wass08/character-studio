"use client";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, SoftShadows } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { Leva } from "leva";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import Avatar from "./Avatar";
import Backdrop from "./Backdrop";
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
        environmentIntensity={0.5}
        environmentRotation={[0, Math.PI / 2, 0]}
        preset="city"
      />

      <ambientLight intensity={0.25} />
      <directionalLight
        position={[-3, 5, -3]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <Backdrop />
      <directionalLight position={[-5, 5, 5]} intensity={1.5} color={"#fff"} />
      {/* <directionalLight position={[3, 3, -5]} intensity={6} color={"#fff"} /> */}

      <Avatar />
    </>
  );
};

const Scene = () => {
  return (
    <Canvas shadows camera={{ fov: 40 }} gl={{ preserveDrawingBuffer: true }}>
      <SceneContent />
    </Canvas>
  );
};

export default Scene;
