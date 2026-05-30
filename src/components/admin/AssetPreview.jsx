"use client";

import {
  Suspense,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { EngineCanvas } from "@/components/scene/EngineCanvas";
import { useCombinedTexture } from "@/hooks/useCombinedTexture";

const DEFAULT_SKIN_COLOR = "#e7a67a";
const IMAGE_RE = /\.(png|jpe?g|webp)$/i;

// Mirror SkinManager: a texture-only asset (makeup) is composited onto the
// base models' skin material maps rather than loaded as its own mesh. Loaded
// in its own component (mounted only when a texture exists) so the useTexture
// suspense + load never runs for plain GLB assets. The resulting texture is
// lifted to the parent and shared across every model's skin material.
const MakeupTextureLoader = ({ textureUrl, onTexture }) => {
  const tex = useCombinedTexture([textureUrl], DEFAULT_SKIN_COLOR);
  useEffect(() => {
    onTexture(tex ?? null);
  }, [tex, onTexture]);
  return null;
};

const SingleModel = ({ url, makeupTexture, onBounds }) => {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    const proxies = [];
    c.traverse((obj) => {
      if (obj.isMesh && obj.name.includes("Plane002")) proxies.push(obj);
    });
    proxies.forEach((p) => {
      p.parent?.remove(p);
    });
    return c;
  }, [scene]);

  useEffect(() => {
    if (!cloned) return undefined;
    const skinMats = [];
    cloned.traverse((obj) => {
      if (!obj.isMesh) return;
      const mat = obj.material;
      if (!mat?.name?.toLowerCase().includes("skin")) return;
      skinMats.push(mat);
    });
    skinMats.forEach((mat) => {
      mat.map = makeupTexture ?? null;
      mat.needsUpdate = true;
    });
    return () => {
      skinMats.forEach((mat) => {
        mat.map = null;
        mat.needsUpdate = true;
      });
    };
  }, [cloned, makeupTexture]);

  useEffect(() => {
    if (!cloned) return;

    // Compute bounds from geometry boundingBoxes — works for SkinnedMesh
    // even without an attached skeleton.
    cloned.updateWorldMatrix(true, true);
    const box = new THREE.Box3();
    const tmpBox = new THREE.Box3();
    const morphs = new Set();
    let any = false;
    cloned.traverse((obj) => {
      const geom = obj.geometry;
      if (geom && obj.isMesh) {
        if (!geom.boundingBox) geom.computeBoundingBox();
        tmpBox.copy(geom.boundingBox);
        tmpBox.applyMatrix4(obj.matrixWorld);
        if (any) box.union(tmpBox);
        else {
          box.copy(tmpBox);
          any = true;
        }
      }
      if (obj.morphTargetDictionary) {
        for (const k of Object.keys(obj.morphTargetDictionary)) morphs.add(k);
      }
    });

    onBounds(url, any && !box.isEmpty() ? box : null, [...morphs]);
  }, [cloned, url, onBounds]);

  return <primitive object={cloned} />;
};

// Renders one or more GLBs together (a single asset, or the full default
// character a makeup texture is previewed on top of). Unions every model's
// bounds into one fit so the camera frames the whole group.
const Models = ({ urls, textureUrl, onFit, onMorphsDetected }) => {
  const [makeupTexture, setMakeupTexture] = useState(null);
  const dataRef = useRef(new Map());

  // Recreated when the model set changes — every mounted SingleModel then
  // re-reports (its effect depends on this), and stale urls are pruned, so
  // the unioned fit always reflects exactly the current set with no
  // child-before-parent effect-ordering races.
  const handleBounds = useCallback(
    (url, box, morphs) => {
      dataRef.current.set(url, { box, morphs });
      for (const key of [...dataRef.current.keys()]) {
        if (!urls.includes(key)) dataRef.current.delete(key);
      }
      const combined = new THREE.Box3();
      const allMorphs = new Set();
      let any = false;
      dataRef.current.forEach(({ box: b, morphs: m }) => {
        if (b) {
          if (any) combined.union(b);
          else {
            combined.copy(b);
            any = true;
          }
        }
        m?.forEach((k) => {
          allMorphs.add(k);
        });
      });
      if (any) {
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        combined.getCenter(center);
        combined.getSize(size);
        const radius = Math.max(size.x, size.y, size.z) * 0.6 || 1;
        onFit?.({ center, radius });
      } else {
        onFit?.({ center: new THREE.Vector3(0, 0, 0), radius: 1 });
      }
      onMorphsDetected?.([...allMorphs]);
    },
    [urls, onFit, onMorphsDetected],
  );

  return (
    <>
      {textureUrl && (
        <Suspense fallback={null}>
          <MakeupTextureLoader
            textureUrl={textureUrl}
            onTexture={setMakeupTexture}
          />
        </Suspense>
      )}
      {urls.map((u) => (
        <Suspense key={u} fallback={null}>
          <SingleModel
            url={u}
            makeupTexture={makeupTexture}
            onBounds={handleBounds}
          />
        </Suspense>
      ))}
    </>
  );
};

const FitCamera = ({ target }) => {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (!target) return;
    const { center, radius } = target;
    const dist = radius * 2.8;
    // View from -Z to match the main scene (assets are authored with their
    // front facing -Z), so the preview shows what the studio will show.
    camera.position.set(center.x, center.y + radius * 0.4, center.z - dist);
    camera.near = Math.max(0.05, dist / 100);
    camera.far = dist * 50;
    camera.updateProjectionMatrix();
    camera.lookAt(center);
  }, [target, camera]);
  return null;
};

const SnapshotBridge = forwardRef((_, ref) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useImperativeHandle(ref, () => ({
    capture: async (size = 512) => {
      try {
        // Async under the unified Renderer — the canvas wouldn't reflect
        // the new frame in time for a synchronous drawImage readback.
        await gl.renderAsync(scene, camera);
      } catch {
        // Falls back to last rendered frame (preserveDrawingBuffer is on).
      }
      const src = gl.domElement;
      const out = document.createElement("canvas");
      out.width = size;
      out.height = size;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("No 2d context");
      const side = Math.min(src.width, src.height);
      const sx = (src.width - side) / 2;
      const sy = (src.height - side) / 2;
      ctx.drawImage(src, sx, sy, side, side, 0, 0, size, size);
      return new Promise((resolve, reject) => {
        out.toBlob((blob) => {
          if (!blob) reject(new Error("Snapshot failed"));
          else resolve(blob);
        }, "image/png");
      });
    },
  }));
  return null;
});
SnapshotBridge.displayName = "SnapshotBridge";

// Mirrors the centered-square crop done by SnapshotBridge.capture so the
// user can frame the model inside the area that will actually be saved.
const SnapshotGuides = () => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <div
      className="aspect-square h-full max-h-full max-w-full"
      style={{
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.6), 0 0 0 9999px rgba(0,0,0,0.35)",
      }}
    >
      <div className="relative h-full w-full">
        <CornerBracket className="left-0 top-0" />
        <CornerBracket className="right-0 top-0 -scale-x-100" />
        <CornerBracket className="bottom-0 left-0 -scale-y-100" />
        <CornerBracket className="bottom-0 right-0 -scale-100" />
        <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/75">
          Snapshot area
        </span>
      </div>
    </div>
  </div>
);

const CornerBracket = ({ className = "" }) => (
  <span
    aria-hidden
    className={`absolute h-3.5 w-3.5 border-l-2 border-t-2 border-white/85 ${className}`}
  />
);

const AssetPreview = forwardRef(
  ({ url, textureUrl = null, height = 360, backgroundColor = null, onMorphsDetected }, ref) => {
  const innerRef = useRef(null);
  const [fit, setFit] = useState(null);

  // GLBs to render in 3D. `url` may be a single GLB (a normal asset) or an
  // array (the full default character a makeup texture sits on top of). Image
  // urls are stripped here so they never reach useGLTF, which would parse the
  // PNG as JSON and crash.
  const modelUrls = useMemo(() => {
    const list = Array.isArray(url) ? url : url ? [url] : [];
    return list.filter((u) => u && !IMAGE_RE.test(u));
  }, [url]);
  const overlayUrl =
    textureUrl ||
    (typeof url === "string" && IMAGE_RE.test(url) ? url : null);
  const hasModels = modelUrls.length > 0;

  useImperativeHandle(ref, () => ({
    capture: (size) => innerRef.current?.capture(size),
  }));

  useEffect(() => {
    setFit(null);
  }, [modelUrls]);

  // R3F's ResizeObserver can miss the initial size when mounted inside a
  // grid column whose width is computed after layout. Nudge a resize on
  // mount so the canvas fills the wrapper.
  useEffect(() => {
    if (!hasModels) return;
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    return () => clearTimeout(t);
  }, [hasModels]);

  if (!hasModels && !overlayUrl) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 text-xs text-white/40"
      >
        Upload a .glb or texture to preview
      </div>
    );
  }

  // Texture with no base models to paint it onto — show the flat image while
  // the default character resolves, or as a fallback when none is available.
  if (!hasModels && overlayUrl) {
    return (
      <div
        style={{ height, backgroundColor: backgroundColor || "#1a1a22" }}
        className="relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/10 p-4"
      >
        <img
          src={overlayUrl}
          alt="texture asset"
          className="max-h-[80%] max-w-full rounded-lg object-contain ring-1 ring-white/10"
        />
        <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/70">
          Texture preview
        </span>
      </div>
    );
  }

  // When a thumbnail background is picked, render it underneath the model
  // so the user can preview how the saved tile will look. Falls back to a
  // checkerboard so transparent pixels read as "transparent".
  const wrapperStyle = backgroundColor
    ? { height, backgroundColor }
    : {
        height,
        backgroundImage:
          "linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%), linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%)",
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 8px 8px",
        backgroundColor: "#1a1a22",
      };

  return (
    <div
      style={wrapperStyle}
      className="relative overflow-hidden rounded-xl border border-white/10"
    >
      <EngineCanvas camera={{ fov: 35, position: [0, 0.4, -3] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.4} />
        <directionalLight position={[-2, 2, -1]} intensity={0.6} />
        <Suspense fallback={null}>
          <Environment preset="city" environmentIntensity={0.6} />
          <Models
            urls={modelUrls}
            textureUrl={overlayUrl}
            onFit={setFit}
            onMorphsDetected={onMorphsDetected}
          />
        </Suspense>
        <FitCamera target={fit} />
        <OrbitControls
          makeDefault
          enableDamping
          target={fit ? [fit.center.x, fit.center.y, fit.center.z] : [0, 0, 0]}
        />
        <SnapshotBridge ref={innerRef} />
      </EngineCanvas>
      <SnapshotGuides />
    </div>
  );
  },
);
AssetPreview.displayName = "AssetPreview";

export default AssetPreview;
