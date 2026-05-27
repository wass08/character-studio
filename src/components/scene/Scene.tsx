"use client";
import { Environment } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Leva } from "leva";
import { type ReactNode, useEffect } from "react";
import * as THREE from "three";
import type { Renderer } from "three/webgpu";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import Avatar from "./Avatar";
import Backdrop from "./Backdrop";
import {
  BACKDROP_PRESETS,
  DEFAULT_BACKDROP,
  type BackdropPresetId,
} from "./backdropPresets";
import { CameraManager } from "./CameraManager";
import { StoreCharacterProvider } from "./CharacterContext";
import { EngineCanvas } from "./EngineCanvas";

type ScreenshotFn = () => Promise<void>;
type CaptureFn = () => Promise<Blob | null>;

type StoreSlice = {
  gender: string;
  backdrop: BackdropPresetId;
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
  const backdropId = useConfiguratorStore(
    (state: StoreSlice) => state.backdrop,
  );
  const backdrop =
    BACKDROP_PRESETS[backdropId] ?? BACKDROP_PRESETS[DEFAULT_BACKDROP];

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
      const rt = new THREE.RenderTarget(SIZE, SIZE, {
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

      // Portrait rig (Phase 2 of plans/app-thumbnails.md). Suppress
      // scene lights + IBL so the saved thumb looks identical no
      // matter which BACKDROP preset is active, then inject a
      // three-point setup. The off-screen render target means none of
      // this is visible to the user mid-capture.
      const suppressed: { light: THREE.Light; visible: boolean }[] = [];
      scene.traverse((obj) => {
        const maybeLight = obj as THREE.Light;
        if (maybeLight.isLight) {
          suppressed.push({ light: maybeLight, visible: maybeLight.visible });
          maybeLight.visible = false;
        }
      });
      const prevEnvironment = scene.environment;
      const prevBackground = scene.background;
      scene.environment = null;
      scene.background = new THREE.Color("#22202a");

      const fill = new THREE.AmbientLight("#e8e4ee", 0.45);
      const key = new THREE.DirectionalLight("#fff4ea", 2.4);
      key.position.set(headPos.x + 1.4, headPos.y + 0.9, headPos.z - 1.0);
      key.target.position.set(headPos.x, headPos.y, headPos.z);
      const sideFill = new THREE.DirectionalLight("#d8d8e8", 0.9);
      sideFill.position.set(headPos.x - 1.2, headPos.y + 0.4, headPos.z - 0.5);
      sideFill.target.position.set(headPos.x, headPos.y, headPos.z);
      const rim = new THREE.DirectionalLight("#fffaf0", 1.6);
      rim.position.set(headPos.x - 0.2, headPos.y + 1.2, headPos.z + 1.6);
      rim.target.position.set(headPos.x, headPos.y, headPos.z);
      const portraitLights = [
        fill,
        key,
        key.target,
        sideFill,
        sideFill.target,
        rim,
        rim.target,
      ];
      portraitLights.forEach((l) => scene.add(l));

      const renderer = gl as unknown as Renderer;
      const prevRT = renderer.getRenderTarget();
      let pixels: Uint8Array;
      try {
        renderer.setRenderTarget(rt);
        renderer.clear();
        await renderer.renderAsync(scene, cam);
        renderer.setRenderTarget(prevRT);
        pixels = (await renderer.readRenderTargetPixelsAsync(
          rt,
          0,
          0,
          SIZE,
          SIZE,
        )) as Uint8Array;
      } finally {
        portraitLights.forEach((l) => scene.remove(l));
        scene.background = prevBackground;
        scene.environment = prevEnvironment;
        suppressed.forEach(({ light, visible }) => {
          light.visible = visible;
        });
        rt.dispose();
      }

      // The unified Renderer returns pixels in canvas orientation (no
      // Y-flip needed). drawImage-downsamples through the browser's 2D
      // scaler — high-quality box filter for our SS step.
      const big = document.createElement("canvas");
      big.width = SIZE;
      big.height = SIZE;
      const bigCtx = big.getContext("2d");
      if (!bigCtx) return null;
      const imageData = bigCtx.createImageData(SIZE, SIZE);
      imageData.data.set(pixels);
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
      <color attach="background" args={[backdrop.background]} />
      <Environment
        background={false}
        environmentIntensity={backdrop.environment.intensity}
        environmentRotation={[0, Math.PI / 2, 0]}
        preset={backdrop.environment.preset}
      />

      <ambientLight
        color={backdrop.ambient.color}
        intensity={backdrop.ambient.intensity}
      />
      <hemisphereLight
        args={[
          backdrop.hemisphere.sky,
          backdrop.hemisphere.ground,
          backdrop.hemisphere.intensity,
        ]}
      />
      <directionalLight
        position={[-3, 5, -3]}
        intensity={backdrop.keyLight.intensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        color={backdrop.keyLight.color}
      />
      <Backdrop preset={backdrop.id} />
      <directionalLight
        position={[-5, 5, 5]}
        intensity={backdrop.fillLight.intensity}
        color={backdrop.fillLight.color}
      />
      <directionalLight
        position={[0.8, 2, -4]}
        intensity={backdrop.rimLight.intensity}
        color={backdrop.rimLight.color}
      />

      <Avatar key={gender} />
      {children}
    </>
  );
};

const Scene = ({ children }: { children?: ReactNode }) => {
  return (
    <EngineCanvas shadows camera={{ fov: 40 }}>
      <StoreCharacterProvider>
        <SceneContent>{children}</SceneContent>
      </StoreCharacterProvider>
    </EngineCanvas>
  );
};

export default Scene;
