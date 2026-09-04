import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Document } from "@gltf-transform/core";

import {
  assemble,
  createNodeIO,
  remapJointAccessors,
} from "../src/assemble.js";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const MAN_MODELS = path.join(REPOSITORY_ROOT, "public/models/characters/man");
const DEFAULT_INPUT = {
  assets: [],
  skinColor: "#E7AF91",
  height: 1,
  morphValues: {},
};

async function assembleAndParse(variant) {
  const armatureBuffer = await readFile(path.join(MAN_MODELS, "Armature.glb"));
  const document = await assemble({
    ...DEFAULT_INPUT,
    armatureBuffer,
    variant: {
      quality: "high",
      pose: "default",
      ...variant,
    },
  });
  const io = await createNodeIO();
  const bytes = await io.writeBinary(document);
  return { bytes, document: await io.readBinary(bytes) };
}

test("armature-only bake retains the animation skeleton and visemes", async () => {
  const { bytes, document } = await assembleAndParse({
    morphs: "visemes",
    compression: "none",
  });
  assert.ok(bytes.byteLength > 0, "output GLB should contain bytes");

  const skins = document.getRoot().listSkins();
  assert.equal(skins.length, 1);
  const jointNames = new Set(
    skins[0].listJoints().map((joint) => joint.getName()),
  );

  const io = await createNodeIO();
  const animations = await io.read(path.join(MAN_MODELS, "Animations.glb"));
  const animatedNodeNames = new Set(
    animations
      .getRoot()
      .listAnimations()
      .flatMap((animation) => animation.listChannels())
      .map((channel) => channel.getTargetNode()?.getName())
      .filter(Boolean),
  );
  for (const nodeName of animatedNodeNames) {
    assert.ok(
      jointNames.has(nodeName),
      `canonical skin should contain animated node "${nodeName}"`,
    );
  }

  const remainingTargetNames = document
    .getRoot()
    .listMeshes()
    .flatMap((mesh) => mesh.getExtras()?.targetNames || []);
  assert.ok(
    remainingTargetNames.every((name) =>
      String(name).toLowerCase().startsWith("viseme"),
    ),
  );
});

test("morphs=none removes all morph targets", async () => {
  const { document } = await assembleAndParse({
    morphs: "none",
    compression: "none",
  });
  const targets = document
    .getRoot()
    .listMeshes()
    .flatMap((mesh) =>
      mesh.listPrimitives().flatMap((primitive) => primitive.listTargets()),
    );
  assert.equal(targets.length, 0);
});

test("JOINTS_0 indices are remapped by joint name", () => {
  const base = new Document();
  const baseJointA = base.createNode("BoneA");
  const baseJointB = base.createNode("BoneB");
  const baseSkin = base
    .createSkin("base")
    .addJoint(baseJointA)
    .addJoint(baseJointB);

  const asset = new Document();
  const assetJointB = asset.createNode("BoneB");
  const assetJointA = asset.createNode("BoneA");
  const assetSkin = asset
    .createSkin("asset")
    .addJoint(assetJointB)
    .addJoint(assetJointA);
  const buffer = asset.createBuffer();
  const positions = asset
    .createAccessor("positions")
    .setBuffer(buffer)
    .setType("VEC3")
    .setArray(new Float32Array([0, 0, 0]));
  const joints = asset
    .createAccessor("joints")
    .setBuffer(buffer)
    .setType("VEC4")
    .setArray(new Uint16Array([0, 1, 0, 1]));
  const primitive = asset
    .createPrimitive()
    .setAttribute("POSITION", positions)
    .setAttribute("JOINTS_0", joints);
  const mesh = asset.createMesh("mesh").addPrimitive(primitive);
  asset.createNode("mesh").setMesh(mesh).setSkin(assetSkin);

  remapJointAccessors(mesh, assetSkin, baseSkin, "synthetic");
  assert.deepEqual(Array.from(joints.getArray()), [1, 0, 1, 0]);
});

// --- Regression: multiple skinned meshes sharing the canonical skin ---------
//
// The shared pipeline's quantize() compensates each mesh's position range by
// rewriting the inverse bind matrices of a per-node clone of the skin. The
// worker then re-unifies every mesh onto the canonical skin; with per-mesh
// quantization volumes that applied the placeholder plane's ~28 m offset to
// every asset mesh and scattered the whole character out of view. Assemble
// the armature plus a synthetic skinned asset and check that every mesh's
// bind-pose geometry lands near the origin, on a single shared skin.

// Column-major 4x4 multiply (glTF layout), out = a * b.
function multiply(out, a, b) {
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

function skinnedBounds(node) {
  const skin = node.getSkin();
  const joints = skin.listJoints();
  const ibm = skin.getInverseBindMatrices().getArray();
  const jointMatrices = joints.map((joint, index) =>
    multiply(
      [],
      joint.getWorldMatrix(),
      ibm.slice(index * 16, index * 16 + 16),
    ),
  );
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const primitive of node.getMesh().listPrimitives()) {
    const position = primitive.getAttribute("POSITION");
    const jointsAttr = primitive.getAttribute("JOINTS_0");
    const weights = primitive.getAttribute("WEIGHTS_0");
    for (let i = 0; i < position.getCount(); i += 1) {
      const v = position.getElement(i, []);
      const j = jointsAttr.getElement(i, []);
      const w = weights.getElement(i, []);
      const out = [0, 0, 0];
      for (let k = 0; k < 4; k += 1) {
        if (!w[k]) continue;
        const m = jointMatrices[j[k]];
        out[0] += w[k] * (m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12]);
        out[1] += w[k] * (m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13]);
        out[2] += w[k] * (m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]);
      }
      for (let a = 0; a < 3; a += 1) {
        min[a] = Math.min(min[a], out[a]);
        max[a] = Math.max(max[a], out[a]);
      }
    }
  }
  return { min, max };
}

async function syntheticSkinnedAsset(io, armatureBuffer) {
  // Reuse the armature's own skinned placeholder as an "asset": same joint
  // names, but renamed (copyAssetMeshes skips nodes called Plane002) and with
  // a small quad near the torso instead of the far-away placeholder quad.
  const document = await io.readBinary(new Uint8Array(armatureBuffer));
  const node = document
    .getRoot()
    .listNodes()
    .find((candidate) => /plane\.?002/i.test(candidate.getName()));
  assert.ok(node, "armature should contain the Plane.002 placeholder node");
  node.setName("SyntheticShirt");
  node.getMesh().setName("SyntheticShirt");
  for (const primitive of node.getMesh().listPrimitives()) {
    const position = primitive.getAttribute("POSITION");
    const count = position.getCount();
    assert.ok(count >= 3, "placeholder should have at least one triangle");
    // Spread whatever vertices the placeholder has over a quad near the torso.
    const next = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      next[index * 3] = index % 2 === 0 ? -0.2 : 0.2;
      next[index * 3 + 1] = index % 4 < 2 ? 0.8 : 1.2;
      next[index * 3 + 2] = 0.1;
    }
    position.setArray(next);
  }
  return io.writeBinary(document);
}

const REGRESSION_VARIANTS = [
  { quality: "medium", compression: "meshopt" },
  { quality: "medium", compression: "none" },
  { quality: "medium", compression: "draco" },
  // quality=low runs simplify() over the collapsed placeholder too.
  { quality: "low", compression: "meshopt" },
];

for (const { quality, compression } of REGRESSION_VARIANTS) {
  test(`skinned asset meshes stay near the origin after a ${quality}/${compression} bake`, async () => {
    const io = await createNodeIO();
    const armatureBuffer = await readFile(
      path.join(MAN_MODELS, "Armature.glb"),
    );
    const assetBuffer = await syntheticSkinnedAsset(io, armatureBuffer);
    const document = await assemble({
      ...DEFAULT_INPUT,
      armatureBuffer,
      assets: [{ buffer: assetBuffer, categoryName: "Top", colors: {} }],
      variant: {
        quality,
        morphs: "visemes",
        pose: "default",
        compression,
      },
    });
    const baked = await io.readBinary(await io.writeBinary(document));
    const root = baked.getRoot();
    assert.equal(root.listSkins().length, 1, "all meshes share one skin");

    const skinnedNodes = root
      .listNodes()
      .filter((node) => node.getMesh() && node.getSkin());
    assert.ok(skinnedNodes.length >= 2, "expected armature + asset meshes");
    for (const node of skinnedNodes) {
      const { min, max } = skinnedBounds(node);
      for (let a = 0; a < 3; a += 1) {
        assert.ok(
          Math.abs(min[a]) < 3 && Math.abs(max[a]) < 3,
          `${node.getName()} bind-pose bounds should stay near the origin, got ${min.map((x) => x.toFixed(2))}..${max.map((x) => x.toFixed(2))}`,
        );
      }
    }

    const shirt = skinnedNodes.find(
      (node) => node.getName() === "SyntheticShirt",
    );
    assert.ok(shirt, "synthetic asset mesh should survive the bake");
    const { min, max } = skinnedBounds(shirt);
    assert.ok(
      max[1] > 0.5 && min[1] < 1.3,
      "shirt quad should sit around torso height",
    );
  });
}
