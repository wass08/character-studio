"use client";
import { Environment } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Leva } from "leva";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import type { Renderer } from "three/webgpu";
import {
  PHOTO_ASPECT_RATIOS,
  useConfiguratorStore,
} from "@/stores/useConfiguratorStore";
import Avatar from "./Avatar";
import Backdrop from "./Backdrop";
import { BootDiamond } from "./BootDiamond";
import {
  BACKDROP_PRESETS,
  type BackdropPresetId,
  DEFAULT_BACKDROP,
} from "./backdropPresets";
import { CameraManager } from "./CameraManager";
import { StoreCharacterProvider } from "./CharacterContext";
import { EngineCanvas } from "./EngineCanvas";
import FrameLimiter from "./FrameLimiter";
import { GPUDeviceWatcher } from "./GPUDeviceWatcher";

type ScreenshotFn = () => Promise<void>;
type CaptureFn = () => Promise<Blob | null>;

type StoreSlice = {
  gender: string;
  backdrop: BackdropPresetId;
  setScreenshot: (fn: ScreenshotFn) => void;
  setCapturePhoto: (fn: CaptureFn) => void;
  setCaptureFaceThumbnail: (fn: CaptureFn) => void;
};

// Centered crop of a canvas down to a target width/height aspect ratio.
// Returns a new canvas; if the source already matches the ratio (within
// 0.5%) the original is returned unchanged.
const cropToAspect = (
  source: HTMLCanvasElement,
  ratio: number,
): HTMLCanvasElement => {
  const W = source.width;
  const H = source.height;
  const currentRatio = W / H;
  if (Math.abs(currentRatio - ratio) / ratio < 0.005) return source;
  let cropW: number;
  let cropH: number;
  let sx: number;
  let sy: number;
  if (currentRatio > ratio) {
    cropH = H;
    cropW = Math.round(H * ratio);
    sx = Math.round((W - cropW) / 2);
    sy = 0;
  } else {
    cropW = W;
    cropH = Math.round(W / ratio);
    sx = 0;
    sy = Math.round((H - cropH) / 2);
  }
  const out = document.createElement("canvas");
  out.width = cropW;
  out.height = cropH;
  const ctx = out.getContext("2d");
  if (!ctx) return source;
  ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
  return out;
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
  const camera = useThree((state) => state.camera);
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
    // WebGPU canvas surfaces are invalidated after each present, so
    // drawImage(gl.domElement) reads a blank frame. Render the live
    // scene into an offscreen RT, read pixels back, then composite.
    const renderToOffscreen = async (): Promise<HTMLCanvasElement | null> => {
      const sourceCanvas = gl.domElement as HTMLCanvasElement;
      // 2× supersample then box-filter via drawImage. Matches the
      // thumbnail pipeline and cleans up the silhouette aliasing that
      // came from reading the unfiltered RT directly. Memory cost for
      // a 1080p shot is ~33 MB transient — fine on modern GPUs.
      const SS = 2;
      const outW = sourceCanvas.width;
      const outH = sourceCanvas.height;
      const W = outW * SS;
      const H = outH * SS;
      const rt = new THREE.RenderTarget(W, H, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        // RTs are linear by default; the readback feeds putImageData
        // which expects sRGB-encoded bytes. Without this the output is
        // a stop or two darker than the live canvas.
        colorSpace: THREE.SRGBColorSpace,
      });
      const renderer = gl as unknown as Renderer;
      const prevRT = renderer.getRenderTarget();
      let pixels: Uint8Array;
      try {
        renderer.setRenderTarget(rt);
        renderer.clear();
        await renderer.renderAsync(scene, camera);
        renderer.setRenderTarget(prevRT);
        pixels = (await renderer.readRenderTargetPixelsAsync(
          rt,
          0,
          0,
          W,
          H,
        )) as Uint8Array;
      } finally {
        rt.dispose();
      }
      // Stage the supersampled pixels onto a big canvas first…
      const big = document.createElement("canvas");
      big.width = W;
      big.height = H;
      const bigCtx = big.getContext("2d");
      if (!bigCtx) return null;
      const imageData = bigCtx.createImageData(W, H);
      // WebGPU's copyTextureToBuffer aligns each row to 256 bytes, so
      // for widths that aren't multiples of 64 px the returned buffer
      // has trailing padding on every row *except the last* (the spec
      // only requires `bytesPerRow * (H - 1) + tightRowBytes` storage).
      // `imageData.data.set(pixels)` overflows in that case. Detect the
      // padded layout and copy row-by-row.
      const tightRowBytes = W * 4;
      const tightTotal = tightRowBytes * H;
      const paddedRowBytes = Math.ceil(tightRowBytes / 256) * 256;
      const paddedTotal = paddedRowBytes * (H - 1) + tightRowBytes;
      if (pixels.length === tightTotal) {
        imageData.data.set(pixels);
      } else if (pixels.length === paddedTotal) {
        for (let y = 0; y < H; y++) {
          imageData.data.set(
            pixels.subarray(
              y * paddedRowBytes,
              y * paddedRowBytes + tightRowBytes,
            ),
            y * tightRowBytes,
          );
        }
      } else {
        console.warn(
          `[capture] readback size mismatch: got ${pixels.length}, expected ${tightTotal} (tight) or ${paddedTotal} (padded, W=${W}, H=${H}, paddedRow=${paddedRowBytes})`,
        );
        return null;
      }
      bigCtx.putImageData(imageData, 0, 0);
      // …then downsample via drawImage's high-quality scaler, which
      // box-filters the SS texels into the output. Costs effectively
      // free anti-aliasing on the silhouette.
      const out = document.createElement("canvas");
      out.width = outW;
      out.height = outH;
      const ctx = out.getContext("2d");
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(big, 0, 0, outW, outH);
      return out;
    };

    const cropToCurrentAspect = (snap: HTMLCanvasElement) => {
      const id = useConfiguratorStore.getState().photoAspectRatio;
      const ratio = PHOTO_ASPECT_RATIOS[id as keyof typeof PHOTO_ASPECT_RATIOS];
      return ratio ? cropToAspect(snap, ratio) : snap;
    };

    const screenshot: ScreenshotFn = async () => {
      const snap = await renderToOffscreen();
      if (!snap) return;
      const blob = await composeWithLogo(cropToCurrentAspect(snap));
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

    const capturePhoto: CaptureFn = async () => {
      const snap = await renderToOffscreen();
      if (!snap) return null;
      return composeWithLogo(cropToCurrentAspect(snap));
    };

    setScreenshot(screenshot);
    setCapturePhoto(capturePhoto);
  }, [gl, scene, camera, setScreenshot, setCapturePhoto]);

  useEffect(() => {
    // Renders a 1024×1024 head-and-shoulders portrait off-screen then
    // downsamples to 512×512 via canvas — cheap 2× supersampling AA
    // for silhouettes (hair, ears). The portable alternative to
    // multisample render targets, which need a manual blit-resolve
    // path that varies by three.js version.
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
        // sRGB-encode in the RT so the read bytes match what the live
        // canvas shows. Without this the saved thumb is visibly darker
        // than the editor view.
        colorSpace: THREE.SRGBColorSpace,
      });
      // Medium portrait framing: head + chest. fov 24° at 1.55m gives
      // ~0.65m of visible height. LookAt 5cm below the head bone keeps
      // the frame center low enough for the chest to fade out at the
      // bottom, while leaving ~6cm of clearance above the hair (enough
      // for tall hairstyles — mohawks, top buns).
      const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
      cam.position.set(headPos.x, headPos.y + 0.05, headPos.z - 1.55);
      cam.lookAt(headPos.x, headPos.y - 0.09, headPos.z);

      // WYSIWYG lighting: render the live scene with its current lights
      // + IBL so the saved thumb matches what the user just saw. Hide
      // the 3D backdrop (stool/plant/floor) so the avatar pops on the
      // transparent bg — chips/cards composite over their own surface.
      const prevBackground = scene.background;
      scene.background = null;
      const backdropRoot = scene.getObjectByName("character-studio-backdrop");
      const prevBackdropVisible = backdropRoot?.visible ?? true;
      if (backdropRoot) backdropRoot.visible = false;

      const renderer = gl as unknown as Renderer;
      const prevRT = renderer.getRenderTarget();
      const prevClearAlpha = renderer.getClearAlpha();
      let pixels: Uint8Array;
      try {
        renderer.setClearAlpha(0);
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
        renderer.setClearAlpha(prevClearAlpha);
        scene.background = prevBackground;
        if (backdropRoot) backdropRoot.visible = prevBackdropVisible;
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
        // Widen the PCF kernel so the floor shadow gets a soft penumbra
        // instead of a hard cutout.
        shadow-radius={7}
        // Belt-and-braces with the per-asset castShadow=false on cloth
        // (Asset.tsx): the skin body still casts the floor shadow but
        // can't self-acne, while normalBias offsets the depth-compare
        // point along the surface normal for any remaining curvy-edge
        // shadow comparisons (hair on face, etc.).
        shadow-normalBias={0.08}
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
      {/* First-load placeholder: a lit 3D octahedron that hides the avatar
          (imperatively) until its meshes decode. Self-contained leaf — never
          re-renders SceneContent, so the engine scene isn't disturbed. */}
      <BootDiamond />
      {children}
    </>
  );
};

const MAX_RECOVERIES = 3; // cap so a permanently-broken GPU can't loop forever

const Scene = ({ children }: { children?: ReactNode }) => {
  // Bumping this key fully unmounts + remounts the Canvas on a FRESH <canvas>
  // DOM node → a fresh WebGPURenderer on a clean GPU device. Recovery path for a
  // real device-loss, triggered by GPUDeviceWatcher. (The StrictMode cold-reload
  // freeze itself is CURED by <FrameLimiter>, which drives rendering off R3F's
  // `_roots` set — so no frame-stall watchdog is needed anymore.)
  const [engineKey, setEngineKey] = useState(0);
  const recoveriesRef = useRef(0);

  const recover = useCallback(() => {
    if (recoveriesRef.current >= MAX_RECOVERIES) return;
    recoveriesRef.current += 1;
    setEngineKey((k) => k + 1);
  }, []);

  return (
    <>
      <Leva hidden />
      {/* frameloop="never" on the PROP (not just imperatively in FrameLimiter):
          R3F's Canvas re-runs configure() on every re-render and would reset
          frameloop to the prop, re-activating its internal loop → the mixer
          would advance twice per frame (double-speed animation). */}
      <EngineCanvas
        key={engineKey}
        frameloop="never"
        // VSM: the only shadow filter in three's WebGPU backend that honors
        // shadow.radius — gives the floor shadow a soft penumbra instead of
        // the harsh PCF cutout.
        shadows="variance"
        camera={{ fov: 40 }}
      >
        <StoreCharacterProvider>
          {/* Drives rendering off `_roots` so R3F's StrictMode teardown can't
              freeze the canvas (the actual cure). */}
          <FrameLimiter fps={60} />
          <SceneContent>{children}</SceneContent>
          <GPUDeviceWatcher onLost={recover} />
        </StoreCharacterProvider>
      </EngineCanvas>
    </>
  );
};

export default Scene;
