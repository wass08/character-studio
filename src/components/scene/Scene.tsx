"use client";
import { Environment } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Leva } from "leva";
import { type ReactNode, useEffect } from "react";
import * as THREE from "three";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import Avatar from "./Avatar";
import Backdrop from "./Backdrop";
import { CameraManager } from "./CameraManager";

type ScreenshotFn = () => Promise<void>;
type CaptureFn = () => Promise<Blob | null>;

type StoreSlice = {
  gender: string;
  setScreenshot: (fn: ScreenshotFn) => void;
  setCapturePhoto: (fn: CaptureFn) => void;
  setCaptureFaceThumbnail: (fn: CaptureFn) => void;
};

const composeWithLogo = (
  sourceCanvas: HTMLCanvasElement,
): Promise<Blob | null> =>
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

const SceneContent = ({ children }: { children?: ReactNode }) => {
  const gender = useConfiguratorStore((state: StoreSlice) => state.gender);

  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const setScreenshot = useConfiguratorStore(
    (state: StoreSlice) => state.setScreenshot,
  );
  const setCapturePhoto = useConfiguratorStore(
    (state: StoreSlice) => state.setCapturePhoto,
  );
  const setCaptureFaceThumbnail = useConfiguratorStore(
    (state: StoreSlice) => state.setCaptureFaceThumbnail,
  );

  useEffect(() => {
    // Triggers a PNG download of the current view with the logo overlay.
    const screenshot: ScreenshotFn = async () => {
      const blob = await composeWithLogo(gl.domElement as HTMLCanvasElement);
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
    const capturePhoto: CaptureFn = async () =>
      composeWithLogo(gl.domElement as HTMLCanvasElement);

    setScreenshot(screenshot);
    setCapturePhoto(capturePhoto);
  }, [gl, setScreenshot, setCapturePhoto]);

  useEffect(() => {
    // Renders a 1024×1024 head-and-shoulders portrait off-screen then
    // downsamples to 512×512 via canvas — cheap 2× supersampling AA
    // for silhouettes (hair, ears). The portable alternative to
    // multisample render targets, which need a manual blit-resolve
    // path that varies by three.js version. Contract documented in
    // wiki/architecture/data-model.md `## Thumbnail capture`.
    const captureFaceThumbnail: CaptureFn = async () => {
      const head = scene.getObjectByName("DEF-head");
      if (!head) return null;
      const headPos = new THREE.Vector3();
      head.getWorldPosition(headPos);

      const OUT = 512; // stored size
      const SS = 2; // supersample factor
      const SIZE = OUT * SS;
      const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      });
      // Head + shoulders framing: camera slightly above and 1.55m
      // behind the head, looking a bit below so the upper torso enters
      // the bottom third of the frame. fov 30 gives ~0.83m of visible
      // height at the head plane — enough for hair top + collarbone.
      const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      cam.position.set(headPos.x, headPos.y + 0.08, headPos.z - 1.55);
      cam.lookAt(headPos.x, headPos.y - 0.22, headPos.z);

      const prevRT = gl.getRenderTarget();
      gl.setRenderTarget(rt);
      gl.clear();
      gl.render(scene, cam);
      gl.setRenderTarget(prevRT);

      const pixels = new Uint8Array(SIZE * SIZE * 4);
      gl.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, pixels);
      rt.dispose();

      // readRenderTargetPixels returns pixels with Y flipped vs. canvas.
      // First copy the raw render into an intermediate canvas at SIZE,
      // then drawImage-downsample into the OUT canvas — the browser's
      // 2D scaler does a high-quality box filter that's our SS step.
      const big = document.createElement("canvas");
      big.width = SIZE;
      big.height = SIZE;
      const bigCtx = big.getContext("2d");
      if (!bigCtx) return null;
      const imageData = bigCtx.createImageData(SIZE, SIZE);
      for (let y = 0; y < SIZE; y++) {
        const srcRow = (SIZE - 1 - y) * SIZE * 4;
        const dstRow = y * SIZE * 4;
        imageData.data.set(
          pixels.subarray(srcRow, srcRow + SIZE * 4),
          dstRow,
        );
      }
      bigCtx.putImageData(imageData, 0, 0);

      const outCanvas = document.createElement("canvas");
      outCanvas.width = OUT;
      outCanvas.height = OUT;
      const outCtx = outCanvas.getContext("2d");
      if (!outCtx) return null;
      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = "high";
      outCtx.drawImage(big, 0, 0, OUT, OUT);
      return new Promise<Blob | null>((resolve) =>
        outCanvas.toBlob(resolve, "image/png"),
      );
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
      <hemisphereLight args={["#fff4ec", "#3a3a4a", 0.55]} />
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
      <directionalLight
        position={[-5, 5, 5]}
        intensity={1.5}
        color="#ffebe3"
      />
      {/* Camera-facing fill so faces aren't lit only from behind. */}
      <directionalLight
        position={[0.8, 2, -4]}
        intensity={0.8}
        color="#fff2e7"
      />

      <Avatar key={gender} />
      {children}
    </>
  );
};

const Scene = ({ children }: { children?: ReactNode }) => {
  return (
    <Canvas shadows camera={{ fov: 40 }} gl={{ preserveDrawingBuffer: true }}>
      <SceneContent>{children}</SceneContent>
    </Canvas>
  );
};

export default Scene;
