// Web Worker — runs the gltf-transform pipeline off the main thread so the
// renderer keeps rendering smoothly while we bake morphs, strip bones,
// optimize and Draco-compress the GLB.
//
// Protocol:
//   main → worker: { id, glb: Uint8Array, options: { visemes, arkit, optimize, draco } }
//   worker → main: { id, ok: true, result: Uint8Array }
//                  { id, ok: false, error: string }

import { NodeIO } from "@gltf-transform/core";
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
const rawDynamicImport = new Function("url", "return import(url);");

// Lazy WASM warm-up — done once per worker.
let meshoptReady = null;
function getMeshoptEncoder() {
  if (!meshoptReady) {
    meshoptReady = MeshoptEncoder.ready.then(() => MeshoptEncoder);
  }
  return meshoptReady;
}

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
async function loadDracoFactory(scriptName, globalName) {
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
    return mod.default;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

let dracoModulesPromise = null;
function getDracoModules() {
  if (!dracoModulesPromise) {
    dracoModulesPromise = (async () => {
      const locateFile = (file) => DRACO_CDN + file;
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
let ioPromise = null;
async function getIO(compression) {
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

function bakeAndPruneMorphs(doc, { keepVisemes, keepArkit }) {
  const isViseme = (n) => String(n).toLowerCase().startsWith("viseme");
  const isArkit = (n) => ARKIT_BLENDSHAPES.has(String(n).toLowerCase());
  const shouldKeep = (name) =>
    (keepVisemes && isViseme(name)) || (keepArkit && isArkit(name));

  doc
    .getRoot()
    .listMeshes()
    .forEach((mesh) => {
      const targetNames = mesh.getExtras()?.targetNames || [];
      if (targetNames.length === 0) return;
      const weights = mesh.getWeights() || [];

      const keepFlags = targetNames.map((n) => shouldKeep(n));
      if (keepFlags.every(Boolean)) return;

      mesh.listPrimitives().forEach((prim) => {
        const targets = prim.listTargets();
        if (targets.length === 0) return;

        ["POSITION", "NORMAL", "TANGENT"].forEach((attrName) => {
          const baseAttr = prim.getAttribute(attrName);
          if (!baseAttr) return;
          const orig = baseAttr.getArray();
          const baked = new orig.constructor(orig);
          let modified = false;

          targets.forEach((target, i) => {
            if (keepFlags[i]) return;
            const w = weights[i];
            if (!w) return;
            const targetAttr = target.getAttribute(attrName);
            if (!targetAttr) return;
            const delta = targetAttr.getArray();
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
            baseAttr.setArray(baked);
          }
        });

        targets.forEach((target, i) => {
          if (!keepFlags[i]) {
            prim.removeTarget(target);
            target.dispose();
          }
        });
      });

      const newTargetNames = [];
      const newWeights = [];
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

function stripBonesUnder(doc, rootBoneName, { includeRoot = false } = {}) {
  const root = doc.getRoot();
  const allNodes = root.listNodes();
  const lowerTarget = rootBoneName.toLowerCase();
  const rootBone =
    allNodes.find((n) => n.getName() === rootBoneName) ||
    allNodes.find((n) => n.getName()?.toLowerCase() === lowerTarget);
  if (!rootBone) return;

  const toRemove = new Set();
  if (includeRoot) toRemove.add(rootBone);
  (function walk(node) {
    node.listChildren().forEach((child) => {
      toRemove.add(child);
      walk(child);
    });
  })(rootBone);
  if (toRemove.size === 0) return;

  let fallbackBone = rootBone;
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
        const next = new arr.constructor(arr.length);
        for (let i = 0; i < arr.length; i++) {
          const mapped = oldToNew[arr[i]];
          next[i] = mapped === -1 ? fallback : mapped;
        }
        jointsAttr.setArray(next);
      }
    }

    const ibm = skin.getInverseBindMatrices();
    if (ibm) {
      const oldArr = ibm.getArray();
      const newArr = new oldArr.constructor(newIdx * 16);
      let writeIdx = 0;
      for (let i = 0; i < oldJoints.length; i++) {
        if (oldToNew[i] === -1) continue;
        for (let k = 0; k < 16; k++) {
          newArr[writeIdx * 16 + k] = oldArr[i * 16 + k];
        }
        writeIdx++;
      }
      ibm.setArray(newArr);
    }

    for (let i = 0; i < oldJoints.length; i++) {
      if (oldToNew[i] === -1) skin.removeJoint(oldJoints[i]);
    }
  }

  for (const node of toRemove) {
    node.dispose();
  }
}

self.onmessage = async (e) => {
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
    // prune sweep up the orphans left by the bake / bone-strip steps.
    await doc.transform(weld({ tolerance: 0.0001 }), dedup(), prune());

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
    self.postMessage({ id, ok: true, result }, [result.buffer]);
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: String(err?.message || err),
    });
  }
};
