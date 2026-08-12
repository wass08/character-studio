"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { type ThreeElements, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type {
  AnimationAction,
  AnimationClip,
  Group,
  Object3D,
  SkinnedMesh,
} from "three";
import { GLTFExporter, SkeletonUtils } from "three-stdlib";
import { sharedAnimationsUrl } from "@/lib/modelAssets";
import { pb } from "@/stores/useConfiguratorStore";
import {
  type ExportOptions,
  type ExportPipeline,
  useCharacter,
} from "./CharacterContext";
import { DeferredAsset } from "./DeferredAsset";
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

  const { scene: armatureScene } = useGLTF(
    `/models/characters/${gender}/Armature.glb`,
  ) as unknown as ArmatureGLTF & { scene: Object3D };

  // NEVER mount the cached GLTF's objects directly: <primitive> REPARENTS the
  // actual cached bones into this scene, gutting drei's shared cache — any
  // other surface that clones the same armature afterwards (the home hero
  // wall after navigating back) gets a boneless clone and renders broken or
  // invisible characters. Clone per mount instead; SkeletonUtils rebinds the
  // skinned meshes to the cloned bones.
  const clone = useMemo(
    () => SkeletonUtils.clone(armatureScene),
    [armatureScene],
  );
  const nodes = useMemo(
    () => ({
      root: clone.getObjectByName("root") as Object3D,
      "MCH-eyes_parent": clone.getObjectByName("MCH-eyes_parent") as Object3D,
      Plane002: clone.getObjectByName("Plane002") as SkinnedMesh,
    }),
    [clone],
  );

  const { animations } = useGLTF(
    sharedAnimationsUrl(gender),
  ) as unknown as AnimationsGLTF;

  const { actions, mixer } = useAnimations(animations, group);

  // R3F runs every useFrame subscriber in one RAF tick with NO per-subscriber
  // error isolation: if drei's useAnimations `mixer.update(delta)` throws —
  // which it does when a clip has a track bound to a bone that isn't in the
  // current rig (a half-applied gender/skeleton swap, a mismatched character) —
  // the throw stops the RAF chain and freezes the ENTIRE canvas until remount.
  // Error boundaries can't catch it (it's outside React render). Wrapping
  // mixer.update means a bad frame is logged and skipped instead of dead.
  useEffect(() => {
    // Idempotent: never wrap an already-wrapped update (StrictMode re-run /
    // HMR / a recovery remount), or we'd nest try/catch layers and, on
    // cleanup, restore a wrapper instead of the real method. Tag the wrapper
    // so we can detect + unwrap precisely.
    type GuardedUpdate = typeof mixer.update & { __guarded?: boolean };
    if ((mixer.update as GuardedUpdate).__guarded) return;
    const original = mixer.update.bind(mixer);
    const guarded = ((delta: number) => {
      try {
        return original(delta);
      } catch (err) {
        console.warn(
          "[avatar] animation mixer.update threw — skipping frame",
          err,
        );
        return mixer;
      }
    }) as GuardedUpdate;
    guarded.__guarded = true;
    mixer.update = guarded;
    return () => {
      // Only restore if we're still the active wrapper.
      if (mixer.update === guarded) mixer.update = original;
    };
  }, [mixer]);

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
    void animations;
    prevActionRef.current = null;
  }, [animations]);

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

  // Self-heal the "stuck in T-pose" race: drei's `actions[name]` is a lazy
  // getter that returns undefined until the root group's ref is attached, and
  // the `actions` object is memoized on the clips alone — it never changes
  // reference when the armature becomes ready. So the play effect above can run
  // once, get undefined, bail, and never re-fire → the Idle clip never starts.
  // If nothing has been played yet (prevActionRef null — also reset on every
  // clip change), start the active clip the first frame it's resolvable. Once
  // something is playing this no-ops, so it never replays one-shot poses.
  useFrame(() => {
    if (prevActionRef.current) return;
    const next = actions[activePose];
    if (!next) return;
    next.reset().fadeIn(0.3).play();
    prevActionRef.current = next;
  });

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

            // Keyed by category (not asset.id) so the wrapper persists across
            // swaps and can keep the old part on screen while the new one
            // preloads, instead of unmounting into a Suspense gap.
            return (
              <DeferredAsset
                key={key}
                categoryName={key}
                url={url}
                skeleton={nodes.Plane002.skeleton}
              />
            );
          })}
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/models/characters/woman/Armature.glb");
useGLTF.preload("/models/characters/man/Armature.glb");
useGLTF.preload(sharedAnimationsUrl("man"));
useGLTF.preload(sharedAnimationsUrl("woman"));
