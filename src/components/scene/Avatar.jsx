import React, { Suspense, useRef, useEffect, useLayoutEffect } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { pb, useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { Asset } from "./Asset";
import { GLTFExporter, SkeletonUtils } from "three-stdlib";
import { SkinManager } from "./SkinManager";

// ───────── Web Worker bridge ─────────
// Heavy gltf-transform work (bake morphs, strip bones, optimize, Draco) runs
// in a worker so the main thread stays free for the renderer.
let exportWorker = null;
let nextWorkerRequestId = 0;
const workerPending = new Map();

function getExportWorker() {
  if (exportWorker) return exportWorker;
  exportWorker = new Worker(new URL("./exportWorker.js", import.meta.url), {
    type: "module",
  });
  exportWorker.onmessage = (e) => {
    const { id, ok, result, error } = e.data;
    const handler = workerPending.get(id);
    if (!handler) return;
    workerPending.delete(id);
    if (ok) handler.resolve(result);
    else handler.reject(new Error(error));
  };
  exportWorker.onerror = (e) => {
    console.error("[export worker]", e.message || e);
  };
  return exportWorker;
}

function runExportPipeline(glb, options) {
  return new Promise((resolve, reject) => {
    const id = ++nextWorkerRequestId;
    workerPending.set(id, { resolve, reject });
    getExportWorker().postMessage({ id, glb, options }, [glb.buffer]);
  });
}

export default function Model(props) {
  const group = useRef();

  const gender = useConfiguratorStore((state) => state.gender);

  const { nodes } = useGLTF(`/models/characters/${gender}/Armature.glb`);

  const { animations } = useGLTF(`/models/characters/${gender}/Animations.glb`);

  const { actions, names } = useAnimations(animations, group);

  const customization = useConfiguratorStore((state) => state.customization);
  const setDownload = useConfiguratorStore((state) => state.setDownload);
  const height = useConfiguratorStore((state) => state.height);

  const pose = useConfiguratorStore((state) => state.pose);

  const remap = (value, inMin, inMax, outMin, outMax) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  };

  useEffect(() => {
    animations.forEach((clip) => {
      clip.tracks = clip.tracks.filter(
        (track) => !track.name.includes(".scale"),
      );
    });
  }, [animations]);

  useEffect(() => {
    const rig = group.current?.getObjectByName("Rig");
    if (rig) {
      const visualScale = remap(height, 0.5, 2.0, 0.95, 1);

      rig.scale.set(visualScale, visualScale, visualScale);
    }
  }, [height]);

  useEffect(() => {
    const action = actions[pose];

    if (action) {
      action.reset().fadeIn(0.5).play();

      return () => action.fadeOut(0.2).stop();
    }
  }, [actions, pose]);

  useEffect(() => {
    const link = document.createElement("a");
    link.style.display = "none";
    document.body.appendChild(link); // Firefox workaround, see #6594

    function save(blob, filename) {
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    }
    async function download(opts = {}) {
      const {
        animations: includeAnimations = true,
        visemes: includeVisemes = false,
        arkit: includeArkit = false,
        tpose = true,
        optimize = true,
        compression = "draco",
        dryRun = false,
      } = opts;

      if (!group.current) return null;

      // Snapshot the live avatar into a detached hierarchy. SkeletonUtils.clone
      // builds a fresh skeleton with new bone instances, so anything we do to
      // the clone (T-pose snap) is invisible to the live renderer.
      const exportRoot = SkeletonUtils.clone(group.current);
      if (tpose) {
        exportRoot.traverse((obj) => {
          if (obj.isSkinnedMesh) obj.skeleton?.pose();
        });
      }

      // Serialize the scene to a raw GLB on the main thread (GLTFExporter
      // needs THREE.Object3D access). Everything past this point — morph
      // baking, bone stripping, optimize passes, Draco compression — runs in
      // a Web Worker so the renderer keeps animating smoothly.
      const exporter = new GLTFExporter();
      const rawGlb = await new Promise((resolve, reject) => {
        exporter.parse(exportRoot, resolve, reject, {
          binary: true,
          animations: includeAnimations ? animations : [],
        });
      });

      const processed = await runExportPipeline(new Uint8Array(rawGlb), {
        visemes: includeVisemes,
        arkit: includeArkit,
        optimize,
        compression,
      });

      if (dryRun) return processed.byteLength;
      save(
        new Blob([processed], { type: "application/octet-stream" }),
        `avatar_${+new Date()}.glb`,
      );
      return processed.byteLength;
    }

    setDownload(download);
  }, [animations]);

  if (!nodes?.root || !nodes?.["MCH-eyes_parent"] || !nodes?.Plane002) {
    return null;
  }

  return (
    <group ref={group} {...props} dispose={null}>
      <Suspense fallback={null}>
        <SkinManager />
      </Suspense>
      <group name="Scene">
        <group
          name="Rig"
          position={[0, 0, 0.098]}
          rotation={[Math.PI, 0, Math.PI]}
          scale={[height, height, height]}
        >
          <primitive object={nodes.root} />
          <primitive object={nodes["MCH-eyes_parent"]} />

          {Object.keys(customization).map((key) => {
            const asset = customization[key]?.asset;
            if (!asset) return null;

            const url = asset.r2Url || (asset.url ? pb.files.getURL(asset, asset.url) : null);
            if (!url) return null;
            const isImage = url.match(/\.(png|jpg|jpeg)$/i);

            if (isImage) return null;

            return (
              <Suspense key={asset.id}>
                <Asset
                  categoryName={key}
                  url={url}
                  skeleton={nodes.Plane002.skeleton}
                />
              </Suspense>
            );
          })}
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/models/characters/woman/Armature.glb");
useGLTF.preload("/models/characters/man/Armature.glb");
useGLTF.preload("/models/characters/man/Animations.glb");
useGLTF.preload("/models/characters/woman/Animations.glb");
