"use client";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { Environment } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Leva } from "leva";
import { useEffect } from "react";
import * as THREE from "three";
import Avatar from "./Avatar";
import Backdrop from "./Backdrop";
import { CameraManager } from "./CameraManager";

const composeWithLogo = (sourceCanvas) =>
  new Promise((resolve) => {
    const out = document.createElement("canvas");
    out.width = sourceCanvas.width;
    out.height = sourceCanvas.height;
    const ctx = out.getContext("2d");
    if (!ctx) return resolve(null);
    ctx.drawImage(sourceCanvas, 0, 0);
    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.onload = () => {
      const w = 765 / 4;
      const h = 370 / 4;
      ctx.drawImage(logo, out.width - w - 42, out.height - h - 42, w, h);
      out.toBlob((blob) => resolve(blob), "image/png");
    };
    logo.onerror = () => out.toBlob((blob) => resolve(blob), "image/png");
    logo.src = "/images/wawasensei-white.png";
  });

const SceneContent = () => {
  const gender = useConfiguratorStore((state) => state.gender);

  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const setScreenshot = useConfiguratorStore((state) => state.setScreenshot);
  const setCapturePhoto = useConfiguratorStore(
    (state) => state.setCapturePhoto,
  );
  const setCaptureFaceThumbnail = useConfiguratorStore(
    (state) => state.setCaptureFaceThumbnail,
  );

  useEffect(() => {
    // Triggers a PNG download of the current view with the logo overlay.
    const screenshot = async () => {
      const blob = await composeWithLogo(gl.domElement);
      if (!blob) return;
      const link = document.createElement("a");
      const date = new Date();
      link.setAttribute(
        "download",
        `Avatar_${date.toISOString().split("T")[0]}.png`,
      );
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    // Same image, returned as a Blob for uploading.
    const capturePhoto = async () => composeWithLogo(gl.domElement);

    setScreenshot(screenshot);
    setCapturePhoto(capturePhoto);
  }, [gl, setScreenshot, setCapturePhoto]);

  useEffect(() => {
    // Renders a 256×256 close-up of the avatar's head off-screen.
    const captureFaceThumbnail = async () => {
      const head = scene.getObjectByName("DEF-head");
      if (!head) return null;
      const headPos = new THREE.Vector3();
      head.getWorldPosition(headPos);

      const SIZE = 256;
      const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      });
      const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
      cam.position.set(headPos.x, headPos.y + 0.04, headPos.z - 0.95);
      cam.lookAt(headPos.x, headPos.y - 0.02, headPos.z);

      const prevRT = gl.getRenderTarget();
      gl.setRenderTarget(rt);
      gl.clear();
      gl.render(scene, cam);
      gl.setRenderTarget(prevRT);

      const pixels = new Uint8Array(SIZE * SIZE * 4);
      gl.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, pixels);
      rt.dispose();

      // readRenderTargetPixels returns pixels with Y flipped vs. canvas.
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      const imageData = ctx.createImageData(SIZE, SIZE);
      for (let y = 0; y < SIZE; y++) {
        const srcRow = (SIZE - 1 - y) * SIZE * 4;
        const dstRow = y * SIZE * 4;
        imageData.data.set(
          pixels.subarray(srcRow, srcRow + SIZE * 4),
          dstRow,
        );
      }
      ctx.putImageData(imageData, 0, 0);
      return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    };
    setCaptureFaceThumbnail(captureFaceThumbnail);
  }, [gl, scene, setCaptureFaceThumbnail]);

  return (
    <>
      <Leva hidden />
      <CameraManager />
      <color attach="background" args={["#222237"]} />
      <Environment
        background={false}
        environmentIntensity={0.5}
        environmentRotation={[0, Math.PI / 2, 0]}
        preset="city"
      />

      <ambientLight intensity={0.55} />
      <hemisphereLight
        args={["#fff4ec", "#3a3a4a", 0.55]}
      />
      <directionalLight
        position={[-3, 5, -3]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        color="#ffebe3"
      />
      <Backdrop />
      <directionalLight position={[-5, 5, 5]} intensity={1.5} color="#ffebe3" />
      {/* Camera-facing fill so faces aren't lit only from behind. */}
      <directionalLight position={[0.8, 2, -4]} intensity={0.8} color="#fff2e7" />

      <Avatar key={gender} />
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
