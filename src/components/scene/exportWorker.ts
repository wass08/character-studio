/// <reference lib="webworker" />

// Web Worker — runs the gltf-transform pipeline off the main thread so the
// renderer keeps rendering smoothly while we bake morphs, strip bones,
// optimize and Draco-compress the GLB.
//
// Protocol:
//   main → worker: { id, glb: Uint8Array, options: { visemes, arkit, optimize, compression } }
//   worker → main: { id, ok: true, result: Uint8Array }
//                  { id, ok: false, error: string }

import {
  type Document,
  type Node as GLTFNode,
  NodeIO,
  type TypedArray,
} from "@gltf-transform/core";
import {
  EXTMeshoptCompression,
  KHRDracoMeshCompression,
} from "@gltf-transform/extensions";
import {
  dedup,
  draco,
  flatten,
  join,
  meshopt,
  prune,
  quantize,
  reorder,
  resample,
  weld,
} from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";

type Compression = "none" | "draco" | "meshopt";

type ExportRequest = {
  id: number;
  glb: Uint8Array;
  options: {
    visemes?: boolean;
    arkit?: boolean;
    optimize?: boolean;
    compression?: Compression;
  };
};

type ExportResponse =
  | { id: number; ok: true; result: Uint8Array }
  | { id: number; ok: false; error: string };

declare const self: DedicatedWorkerGlobalScope;

// Same-origin Draco. We copied draco3d's universal Emscripten builds (encoder
// + decoder + WASM) into /public/draco/ at install time. Cross-origin CDNs
// (gstatic, unpkg) either don't host the encoder or don't set CORS headers
// that allow `fetch()` from a worker; serving the files ourselves sidesteps
// both problems.
//
// Resolved against `self.location.origin` because the worker is bundled into
// `/_next/static/chunks/...` and a bare `/draco/...` would otherwise fail to
// parse as a URL inside the worker context.
const DRACO_CDN = `${self.location.origin}/draco/`;

// `new Function()` compiles a function whose body is a literal string; the
// bundler (Turbopack) can't analyse `return import(url)` inside it, so the
// dynamic import lands on the browser's native loader instead of getting
// rewritten into a CJS-shim that rejects blob URLs as "Cannot find module
// 'unknown'".
type DynamicImporter = (url: string) => Promise<{ default: unknown }>;
const rawDynamicImport = new Function(
  "url",
  "return import(url);",
) as DynamicImporter;

// Lazy WASM warm-up — done once per worker.
type MeshoptEncoderModule = typeof MeshoptEncoder;
let meshoptReady: Promise<MeshoptEncoderModule> | null = null;
function getMeshoptEncoder(): Promise<MeshoptEncoderModule> {
  if (!meshoptReady) {
    meshoptReady = MeshoptEncoder.ready.then(() => MeshoptEncoder);
  }
  return meshoptReady;
}

// Emscripten module factories are untyped runtime constructs; the encoder/
// decoder instances they return are passed back into gltf-transform without
// further inspection from this file.
type DracoFactory = (config: {
  locateFile: (file: string) => string;
}) => Promise<unknown>;

// Load a Draco Emscripten module factory from gstatic by fetching the script
// text, wrapping it as an ES module that re-exports the global the script
// declares (e.g. `DracoEncoderModule`), and dynamically importing the result
// via a blob URL.
//
// The wrapper deliberately shadows `importScripts`, `require`, and `process`:
//   - This is a *module* worker, so it lacks a real `importScripts` — but
//     Emscripten uses `typeof importScripts === "function"` to decide whether
//     it's in a Web Worker. We stub it to flip the detection ON.
//   - Turbopack injects a `process` shim into worker globals (so
//     `process.env.NODE_ENV` works in Next.js code). Emscripten interprets
//     that as "we're in Node" and tries to `require('fs')`, which the
//     bundler's runtime then rejects with "Cannot find module 'unknown'". We
//     shadow both `process` and `require` to keep Emscripten on the Web
//     Worker code path, which loads the WASM via fetch + `locateFile`.
async function loadDracoFactory(
  scriptName: string,
  globalName: string,
): Promise<DracoFactory> {
  const code = await fetch(DRACO_CDN + scriptName).then((res) => {
    if (!res.ok) {
      throw new Error(
        `Failed to fetch Draco ${scriptName} (HTTP ${res.status})`,
      );
    }
    return res.text();
  });
  const wrapped = [
    "const importScripts = () => {};",
    "const require = undefined;",
    "const process = undefined;",
    code,
    `export default ${globalName};`,
  ].join("\n");
  const blobUrl = URL.createObjectURL(
    new Blob([wrapped], { type: "application/javascript" }),
  );
  try {
    const mod = await rawDynamicImport(blobUrl);
    return mod.default as DracoFactory;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

let dracoModulesPromise: Promise<{
  encoder: unknown;
  decoder: unknown;
}> | null = null;
function getDracoModules() {
  if (!dracoModulesPromise) {
    dracoModulesPromise = (async () => {
      const locateFile = (file: string) => DRACO_CDN + file;
      const [encoderFactory, decoderFactory] = await Promise.all([
        loadDracoFactory("draco_encoder.js", "DracoEncoderModule"),
        loadDracoFactory("draco_decoder.js", "DracoDecoderModule"),
      ]);
      const [encoder, decoder] = await Promise.all([
        encoderFactory({ locateFile }),
        decoderFactory({ locateFile }),
      ]);
      return { encoder, decoder };
    })();
  }
  return dracoModulesPromise;
}

// Build a NodeIO with both compression extensions registered. The MeshoptEncoder
// is wired up eagerly (it ships with the meshoptimizer package and warms
// quickly); the Draco encoder/decoder are wired up on demand the first time
// a Draco export is requested, since fetching them takes a network round-trip.
let ioPromise: Promise<NodeIO> | null = null;
async function getIO(compression: Compression): Promise<NodeIO> {
  if (!ioPromise) {
    ioPromise = getMeshoptEncoder().then((encoder) =>
      new NodeIO()
        .registerExtensions([EXTMeshoptCompression, KHRDracoMeshCompression])
        .registerDependencies({ "meshopt.encoder": encoder }),
    );
  }
  const io = await ioPromise;
  if (compression === "draco") {
    const { encoder, decoder } = await getDracoModules();
    io.registerDependencies({
      "draco3d.encoder": encoder,
      "draco3d.decoder": decoder,
    });
  }
  return io;
}

// Apple's canonical 52 ARKit face blendshapes.
// Reference: https://arkit-face-blendshapes.com/
const ARKIT_BLENDSHAPES = new Set(
  [
    "browDownLeft",
    "browDownRight",
    "browInnerUp",
    "browOuterUpLeft",
    "browOuterUpRight",
    "cheekPuff",
    "cheekSquintLeft",
    "cheekSquintRight",
    "eyeBlinkLeft",
    "eyeBlinkRight",
    "eyeLookDownLeft",
    "eyeLookDownRight",
    "eyeLookInLeft",
    "eyeLookInRight",
    "eyeLookOutLeft",
    "eyeLookOutRight",
    "eyeLookUpLeft",
    "eyeLookUpRight",
    "eyeSquintLeft",
    "eyeSquintRight",
    "eyeWideLeft",
    "eyeWideRight",
    "jawForward",
    "jawLeft",
    "jawOpen",
    "jawRight",
    "mouthClose",
    "mouthDimpleLeft",
    "mouthDimpleRight",
    "mouthFrownLeft",
    "mouthFrownRight",
    "mouthFunnel",
    "mouthLeft",
    "mouthLowerDownLeft",
    "mouthLowerDownRight",
    "mouthPressLeft",
    "mouthPressRight",
    "mouthPucker",
    "mouthRight",
    "mouthRollLower",
    "mouthRollUpper",
    "mouthShrugLower",
    "mouthShrugUpper",
    "mouthSmileLeft",
    "mouthSmileRight",
    "mouthStretchLeft",
    "mouthStretchRight",
    "mouthUpperUpLeft",
    "mouthUpperUpRight",
    "noseSneerLeft",
    "noseSneerRight",
    "tongueOut",
  ].map((n) => n.toLowerCase()),
);

type MutableTypedArray =
  | Float32Array
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | Int16Array
  | Int8Array;
type TypedArrayCtor = new (
  arg: ArrayLike<number> | number,
) => MutableTypedArray;

function bakeAndPruneMorphs(
  doc: Document,
  { keepVisemes, keepArkit }: { keepVisemes: boolean; keepArkit: boolean },
) {
  const isViseme = (n: string) => String(n).toLowerCase().startsWith("viseme");
  const isArkit = (n: string) => ARKIT_BLENDSHAPES.has(String(n).toLowerCase());
  const shouldKeep = (name: string) =>
    (keepVisemes && isViseme(name)) || (keepArkit && isArkit(name));

  doc
    .getRoot()
    .listMeshes()
    .forEach((mesh) => {
      const extras = mesh.getExtras() as { targetNames?: string[] } | undefined;
      const targetNames: string[] = extras?.targetNames ?? [];
      if (targetNames.length === 0) return;
      const weights = mesh.getWeights() || [];

      const keepFlags = targetNames.map((n) => shouldKeep(n));
      if (keepFlags.every(Boolean)) return;

      mesh.listPrimitives().forEach((prim) => {
        const targets = prim.listTargets();
        if (targets.length === 0) return;

        (["POSITION", "NORMAL", "TANGENT"] as const).forEach((attrName) => {
          const baseAttr = prim.getAttribute(attrName);
          if (!baseAttr) return;
          const orig = baseAttr.getArray();
          if (!orig) return;
          const Ctor = orig.constructor as TypedArrayCtor;
          const baked = new Ctor(orig) as unknown as Float32Array;
          let modified = false;

          targets.forEach((target, i) => {
            if (keepFlags[i]) return;
            const w = weights[i];
            if (!w) return;
            const targetAttr = target.getAttribute(attrName);
            if (!targetAttr) return;
            const delta = targetAttr.getArray();
            if (!delta) return;
            for (let j = 0; j < baked.length; j++) {
              baked[j] += w * delta[j];
            }
            modified = true;
          });

          if (modified) {
            if (attrName === "NORMAL") {
              for (let j = 0; j < baked.length; j += 3) {
                const x = baked[j];
                const y = baked[j + 1];
                const z = baked[j + 2];
                const len = Math.sqrt(x * x + y * y + z * z) || 1;
                baked[j] = x / len;
                baked[j + 1] = y / len;
                baked[j + 2] = z / len;
              }
            }
            baseAttr.setArray(baked as TypedArray);
          }
        });

        targets.forEach((target, i) => {
          if (!keepFlags[i]) {
            prim.removeTarget(target);
            target.dispose();
          }
        });
      });

      const newTargetNames: string[] = [];
      const newWeights: number[] = [];
      targetNames.forEach((name, i) => {
        if (keepFlags[i]) {
          newTargetNames.push(name);
          newWeights.push(weights[i] || 0);
        }
      });
      mesh.setExtras({ ...mesh.getExtras(), targetNames: newTargetNames });
      mesh.setWeights(newWeights);
    });
}

function stripBonesUnder(
  doc: Document,
  rootBoneName: string,
  { includeRoot = false }: { includeRoot?: boolean } = {},
) {
  const root = doc.getRoot();
  const allNodes = root.listNodes();
  const lowerTarget = rootBoneName.toLowerCase();
  const rootBone =
    allNodes.find((n) => n.getName() === rootBoneName) ||
    allNodes.find((n) => n.getName()?.toLowerCase() === lowerTarget);
  if (!rootBone) return;

  const toRemove = new Set<GLTFNode>();
  if (includeRoot) toRemove.add(rootBone);
  (function walk(node: GLTFNode) {
    node.listChildren().forEach((child) => {
      toRemove.add(child);
      walk(child);
    });
  })(rootBone);
  if (toRemove.size === 0) return;

  let fallbackBone: GLTFNode | null = rootBone;
  if (includeRoot) {
    fallbackBone = null;
    for (const n of root.listNodes()) {
      if (n.listChildren().includes(rootBone)) {
        fallbackBone = n;
        break;
      }
    }
  }

  for (const skin of root.listSkins()) {
    const oldJoints = skin.listJoints();
    const oldToNew = new Int32Array(oldJoints.length);
    let newIdx = 0;
    let removedCount = 0;
    for (let i = 0; i < oldJoints.length; i++) {
      if (toRemove.has(oldJoints[i])) {
        oldToNew[i] = -1;
        removedCount++;
      } else {
        oldToNew[i] = newIdx++;
      }
    }
    if (removedCount === 0) continue;

    let fallback = 0;
    if (fallbackBone) {
      const idx = oldJoints.indexOf(fallbackBone);
      if (idx >= 0 && oldToNew[idx] !== -1) fallback = oldToNew[idx];
    }

    for (const node of root.listNodes()) {
      if (node.getSkin() !== skin) continue;
      const mesh = node.getMesh();
      if (!mesh) continue;
      for (const prim of mesh.listPrimitives()) {
        const jointsAttr = prim.getAttribute("JOINTS_0");
        if (!jointsAttr) continue;
        const arr = jointsAttr.getArray();
        if (!arr) continue;
        const Ctor = arr.constructor as TypedArrayCtor;
        const next = new Ctor(arr.length) as unknown as Uint8Array;
        for (let i = 0; i < arr.length; i++) {
          const mapped = oldToNew[arr[i]];
          next[i] = mapped === -1 ? fallback : mapped;
        }
        jointsAttr.setArray(next as TypedArray);
      }
    }

    const ibm = skin.getInverseBindMatrices();
    if (ibm) {
      const oldArr = ibm.getArray();
      if (oldArr) {
        const Ctor = oldArr.constructor as TypedArrayCtor;
        const newArr = new Ctor(newIdx * 16) as unknown as Float32Array;
        let writeIdx = 0;
        for (let i = 0; i < oldJoints.length; i++) {
          if (oldToNew[i] === -1) continue;
          for (let k = 0; k < 16; k++) {
            newArr[writeIdx * 16 + k] = oldArr[i * 16 + k];
          }
          writeIdx++;
        }
        ibm.setArray(newArr as TypedArray);
      }
    }

    for (let i = 0; i < oldJoints.length; i++) {
      if (oldToNew[i] === -1) skin.removeJoint(oldJoints[i]);
    }
  }

  for (const node of toRemove) {
    node.dispose();
  }
}

self.onmessage = async (e: MessageEvent<ExportRequest>) => {
  const { id, glb, options } = e.data;
  const {
    visemes = false,
    arkit = false,
    optimize = true,
    compression = "meshopt",
  } = options;

  try {
    const io = await getIO(compression);
    const doc = await io.readBinary(glb);

    bakeAndPruneMorphs(doc, { keepVisemes: visemes, keepArkit: arkit });

    stripBonesUnder(doc, "DEF-head");
    stripBonesUnder(doc, "MCH-eyes_parent", { includeRoot: true });

    // Always-on cleanup. weld() in particular is non-negotiable for Draco —
    // Three.js's GLTFExporter routinely produces hundreds of coincident
    // vertices per mesh (UV/normal splits, de-interleaved attributes), and
    // Draco's compression ratio collapses on unwelded geometry. dedup +
    // prune sweep up the orphans left by the bake / bone-strip steps. The
    // older `weld({ tolerance })` option was dropped in gltf-transform; the
    // current default is bitwise-identical welding, which is what we want.
    await doc.transform(weld(), dedup(), prune());

    if (optimize) {
      // Heavier lossless transforms (gated by the Optimize toggle).
      //   flatten   — bake non-skin transforms into geometry
      //   join      — merge compatible primitives (same material + parent transform)
      //   resample  — strip redundant animation keyframes
      //   quantize  — lower-precision attribute storage
      // (instance() is intentionally skipped — gltf-transform itself logs
      //  "Instancing is not currently supported for animated models." so it
      //  was just wasted work in our case.)
      await doc.transform(flatten(), join(), resample(), quantize());
    }

    if (compression === "draco" || compression === "meshopt") {
      // reorder() interleaves attributes + reorders triangles/vertices for
      // the GPU vertex cache — the same "Interleaved buffers" pass gltf.report
      // runs. Critical for getting good compression on a Three.js-exported
      // scene, regardless of which compressor we hand the data to next.
      const meshoptEnc = await getMeshoptEncoder();
      await doc.transform(reorder({ encoder: meshoptEnc }));

      if (compression === "draco") {
        await doc.transform(draco());
      } else {
        await doc.transform(meshopt({ encoder: meshoptEnc, level: "medium" }));
      }
    }

    const result = await io.writeBinary(doc);
    const response: ExportResponse = { id, ok: true, result };
    self.postMessage(response, [result.buffer as ArrayBuffer]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err ?? "Unknown error");
    const response: ExportResponse = { id, ok: false, error: message };
    self.postMessage(response);
  }
};
