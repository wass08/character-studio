"use client";

import {
  Suspense,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const Model = ({ url, onFit }) => {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    if (!cloned) return;

    // Compute bounds from geometry boundingBoxes — works for SkinnedMesh
    // even without an attached skeleton.
    cloned.updateWorldMatrix(true, true);
    const box = new THREE.Box3();
    const tmpBox = new THREE.Box3();
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
    });

    if (!any || box.isEmpty()) {
      onFit?.({ center: new THREE.Vector3(0, 0, 0), radius: 1 });
      return;
    }
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const radius = Math.max(size.x, size.y, size.z) * 0.6 || 1;
    onFit?.({ center, radius });
  }, [cloned, onFit]);

  return <primitive object={cloned} />;
};

const FitCamera = ({ target }) => {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (!target) return;
    const { center, radius } = target;
    const dist = radius * 2.8;
    camera.position.set(center.x, center.y + radius * 0.4, center.z + dist);
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
    capture: async (size = 512) =>
      new Promise((resolve, reject) => {
        try {
          gl.render(scene, camera);
        } catch {
          // Falls back to last rendered frame (preserveDrawingBuffer is on).
        }
        const src = gl.domElement;
        const out = document.createElement("canvas");
        out.width = size;
        out.height = size;
        const ctx = out.getContext("2d");
        if (!ctx) return reject(new Error("No 2d context"));
        const side = Math.min(src.width, src.height);
        const sx = (src.width - side) / 2;
        const sy = (src.height - side) / 2;
        try {
          ctx.drawImage(src, sx, sy, side, side, 0, 0, size, size);
        } catch (err) {
          return reject(err);
        }
        out.toBlob((blob) => {
          if (!blob) reject(new Error("Snapshot failed"));
          else resolve(blob);
        }, "image/png");
      }),
  }));
  return null;
});
SnapshotBridge.displayName = "SnapshotBridge";

const AssetPreview = forwardRef(({ url, height = 360 }, ref) => {
  const innerRef = useRef(null);
  const [fit, setFit] = useState(null);

  useImperativeHandle(ref, () => ({
    capture: (size) => innerRef.current?.capture(size),
  }));

  useEffect(() => {
    setFit(null);
  }, [url]);

  // R3F's ResizeObserver can miss the initial size when mounted inside a
  // grid column whose width is computed after layout. Nudge a resize on
  // mount so the canvas fills the wrapper.
  useEffect(() => {
    if (!url) return;
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    return () => clearTimeout(t);
  }, [url]);

  if (!url) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 text-xs text-white/40"
      >
        Upload a .glb to preview
      </div>
    );
  }

  return (
    <div
      style={{
        height,
        // Subtle checkerboard so transparent areas read as "transparent" in
        // the preview without baking a background into the captured PNG.
        backgroundImage:
          "linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%), linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%)",
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 8px 8px",
        backgroundColor: "#1a1a22",
      }}
      className="overflow-hidden rounded-xl border border-white/10"
    >
      <Canvas
        camera={{ fov: 35, position: [0, 0.4, 3] }}
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.4} />
        <directionalLight position={[-2, 2, -1]} intensity={0.6} />
        <Suspense fallback={null}>
          <Environment preset="city" environmentIntensity={0.6} />
          <Model url={url} onFit={setFit} />
        </Suspense>
        <FitCamera target={fit} />
        <OrbitControls
          makeDefault
          enableDamping
          target={fit ? [fit.center.x, fit.center.y, fit.center.z] : [0, 0, 0]}
        />
        <SnapshotBridge ref={innerRef} />
      </Canvas>
    </div>
  );
});
AssetPreview.displayName = "AssetPreview";

export default AssetPreview;
