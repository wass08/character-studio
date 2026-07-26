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
const MAN_MODELS = path.join(
  REPOSITORY_ROOT,
  "public/models/characters/man",
);
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
  const jointNames = new Set(skins[0].listJoints().map((joint) => joint.getName()));

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
