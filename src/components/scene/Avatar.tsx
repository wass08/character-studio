"use client";

import { pb } from "@/stores/useConfiguratorStore";
import { useAnimations, useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import type {
  AnimationAction,
  AnimationClip,
  Group,
  Object3D,
  SkinnedMesh,
} from "three";
import { GLTFExporter, SkeletonUtils } from "three-stdlib";
import { Asset } from "./Asset";
import {
  type ExportOptions,
  type ExportPipeline,
  useCharacter,
} from "./CharacterContext";
import { SkinManager } from "./SkinManager";

// ───────── Web Worker bridge ─────────
// Heavy gltf-transform work (bake morphs, strip bones, optimize, Draco) runs
// in a worker so the main thread stays free for the renderer.
type WorkerSuccess = { id: number; ok: true; result: Uint8Array };
type WorkerFailure = { id: number; ok: false; error: string };
type WorkerResponse = WorkerSuccess | WorkerFailure;

type PendingHandler = {
  resolve: (value: Uint8Array) => void;
  reject: (reason: Error) => void;
};

let exportWorker: Worker | null = null;
let nextWorkerRequestId = 0;
const workerPending = new Map<number, PendingHandler>();

function getExportWorker(): Worker {
  if (exportWorker) return exportWorker;
  exportWorker = new Worker(new URL("./exportWorker.ts", import.meta.url), {
    type: "module",
  });
  exportWorker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const { id, ok } = e.data;
    const handler = workerPending.get(id);
    if (!handler) return;
    workerPending.delete(id);
    if (ok) {
      handler.resolve(e.data.result);
    } else {
      handler.reject(new Error(e.data.error));
    }
  };
  exportWorker.onerror = (e) => {
    console.error("[export worker]", e.message || e);
  };
  return exportWorker;
}

type ExportPipelineOptions = {
  visemes: boolean;
  arkit: boolean;
  optimize: boolean;
  compression: NonNullable<ExportOptions["compression"]>;
};

function runExportPipeline(
  glb: Uint8Array,
  options: ExportPipelineOptions,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const id = ++nextWorkerRequestId;
    workerPending.set(id, { resolve, reject });
    getExportWorker().postMessage({ id, glb, options }, [glb.buffer]);
  });
}

type ArmatureGLTF = {
  nodes: {
    root: Object3D;
    "MCH-eyes_parent": Object3D;
    Plane002: SkinnedMesh;
  };
};

type AnimationsGLTF = {
  animations: AnimationClip[];
};

type ModelProps = ThreeElements["group"];

const remap = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) => ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

export default function Model(props: ModelProps) {
  const group = useRef<Group>(null);

  const { gender, customization, height, pose, gesture, setDownload } =
    useCharacter();

  // The idle-juice gesture (when set) takes over the rig; otherwise the
  // canonical pose drives the animation. Crossfading between them is handled
  // by the effect below.
  const activePose = gesture || pose;

  const { nodes } = useGLTF(
    `/models/characters/${gender}/Armature.glb`,
  ) as unknown as ArmatureGLTF;

  const { animations } = useGLTF(
    `/models/characters/${gender}/Animations.glb`,
  ) as unknown as AnimationsGLTF;

  const { actions } = useAnimations(animations, group);

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
      const visualScale = remap(height, 0.5, 2.0, 0.7, 1.1);
      rig.scale.set(visualScale, visualScale, visualScale);
    }
  }, [height]);

  // Crossfade between poses instead of stop/start, otherwise the rig
  // momentarily collapses to its rest pose (T-pose) during the 0.5s
  // window when the new clip is ramping up from weight 0. crossFadeFrom
  // overlaps the two actions' weights so the rig stays fully driven.
  const prevActionRef = useRef<AnimationAction | null>(null);

  // Drop the stale reference when the animation set changes (gender
  // swap loads a fresh Animations.glb with new action instances).
  useEffect(() => {
    prevActionRef.current = null;
  }, [actions]);

  useEffect(() => {
    const next = actions[activePose];
    if (!next) return;
    const prev = prevActionRef.current;
    if (prev && prev !== next) {
      next.reset().play();
      next.crossFadeFrom(prev, 0.4, true);
    } else {
      next.reset().fadeIn(0.4).play();
    }
    prevActionRef.current = next;
  }, [actions, activePose]);

  useEffect(() => {
    const link = document.createElement("a");
    link.style.display = "none";
    document.body.appendChild(link); // Firefox workaround, see #6594

    function save(blob: Blob, filename: string) {
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    }

    const download: ExportPipeline = async (opts = {}) => {
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
          const skinned = obj as SkinnedMesh;
          if (skinned.isSkinnedMesh) skinned.skeleton?.pose();
        });
      }

      // Serialize the scene to a raw GLB on the main thread (GLTFExporter
      // needs THREE.Object3D access). Everything past this point — morph
      // baking, bone stripping, optimize passes, Draco compression — runs in
      // a Web Worker so the renderer keeps animating smoothly.
      const exporter = new GLTFExporter();
      const rawGlb = (await new Promise<ArrayBuffer>((resolve, reject) => {
        exporter.parse(
          exportRoot,
          (result) => resolve(result as ArrayBuffer),
          reject,
          {
            binary: true,
            animations: includeAnimations ? animations : [],
          },
        );
      })) as ArrayBuffer;

      const processed = await runExportPipeline(new Uint8Array(rawGlb), {
        visemes: includeVisemes,
        arkit: includeArkit,
        optimize,
        compression,
      });

      if (dryRun) return processed.byteLength;
      // Blob's TS sig requires Uint8Array<ArrayBuffer>; the worker hands us
      // Uint8Array<ArrayBufferLike>. The runtime is identical.
      save(
        new Blob([processed as BlobPart], { type: "application/octet-stream" }),
        `avatar_${Date.now()}.glb`,
      );
      return processed.byteLength;
    };

    setDownload(download);
  }, [animations, setDownload]);

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

            const url =
              asset.r2Url ||
              (asset.url
                ? pb.files.getURL(
                    asset as { collectionId?: string; id?: string },
                    asset.url,
                  )
                : null);
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
