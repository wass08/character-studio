import type {
  Document,
  Node as GLTFNode,
  TypedArray,
} from "@gltf-transform/core";
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
import type { MeshoptEncoder } from "meshoptimizer";

// Apple's canonical 52 ARKit face blendshapes.
// Reference: https://arkit-face-blendshapes.com/
export const ARKIT_BLENDSHAPES = new Set(
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

export function bakeAndPruneMorphs(
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

export function stripBonesUnder(
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

export type BakePipelineOptions = {
  visemes?: boolean;
  arkit?: boolean;
  optimize?: boolean;
  compression?: "none" | "draco" | "meshopt";
  stripFaceBones?: boolean;
};

export async function runBakePipeline(
  doc: Document,
  options: BakePipelineOptions,
  deps: { meshoptEncoder: typeof MeshoptEncoder },
) {
  const {
    visemes = false,
    arkit = false,
    optimize = true,
    compression = "meshopt",
    stripFaceBones = true,
  } = options;

  bakeAndPruneMorphs(doc, { keepVisemes: visemes, keepArkit: arkit });

  if (stripFaceBones) {
    stripBonesUnder(doc, "DEF-head");
    stripBonesUnder(doc, "MCH-eyes_parent", { includeRoot: true });
  }

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
    await doc.transform(reorder({ encoder: deps.meshoptEncoder }));

    if (compression === "draco") {
      await doc.transform(draco());
    } else {
      await doc.transform(
        meshopt({ encoder: deps.meshoptEncoder, level: "medium" }),
      );
    }
  }
}
