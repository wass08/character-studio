import { NodeIO, VertexLayout } from "@gltf-transform/core";
import {
  ALL_EXTENSIONS,
  EXTMeshoptCompression,
  KHRDracoMeshCompression,
} from "@gltf-transform/extensions";
import {
  copyToDocument,
  prune,
  simplify,
  textureCompress,
  unpartition,
} from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import {
  MeshoptDecoder,
  MeshoptEncoder,
  MeshoptSimplifier,
} from "meshoptimizer";
import sharp from "sharp";

import { runBakePipeline } from "./generated/pipeline.ts";

const PHYSICAL_MATERIAL_EXTENSIONS = [
  "KHR_materials_clearcoat",
  "KHR_materials_sheen",
  "KHR_materials_specular",
  "KHR_materials_ior",
  "KHR_materials_transmission",
];

let ioPromise;

export async function createNodeIO() {
  if (!ioPromise) {
    ioPromise = (async () => {
      await Promise.all([
        MeshoptDecoder.ready,
        MeshoptEncoder.ready,
        MeshoptSimplifier.ready,
      ]);
      const [dracoEncoder, dracoDecoder] = await Promise.all([
        draco3d.createEncoderModule(),
        draco3d.createDecoderModule(),
      ]);
      return (
        new NodeIO()
          .registerExtensions(ALL_EXTENSIONS)
          .registerDependencies({
            "draco3d.encoder": dracoEncoder,
            "draco3d.decoder": dracoDecoder,
            "meshopt.encoder": MeshoptEncoder,
            "meshopt.decoder": MeshoptDecoder,
          })
          // One buffer view per vertex attribute. With the default interleaved
          // layout, uncompressed (compression=none) variants pack the
          // non-normalized Uint8 JOINTS_0 next to normalized Uint8 WEIGHTS_0/
          // COLOR_0 in one buffer; three.js' WebGPU backend widens that shared
          // buffer to Uint32 for the joints and then requests an invalid
          // "unorm32x4" vertex format for the weights, killing every render
          // pipeline on the page. Meshopt/Draco outputs are unaffected.
          .setVertexLayout(VertexLayout.SEPARATE)
      );
    })();
  }
  return ioPromise;
}

function normalizeNodeName(name) {
  return String(name)
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function findRequiredNode(document, expectedName) {
  const normalized = normalizeNodeName(expectedName);
  const node = document
    .getRoot()
    .listNodes()
    .find((candidate) => normalizeNodeName(candidate.getName()) === normalized);
  if (!node) {
    throw new Error(`Armature is missing required node "${expectedName}"`);
  }
  return node;
}

function quaternionFromEulerXYZ(x, y, z) {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);
  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3,
  ];
}

function remap(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

function addRigToSkin(document, skin, rig) {
  if (skin.listJoints().includes(rig)) {
    return;
  }

  const inverseBindMatrices = skin.getInverseBindMatrices();
  if (inverseBindMatrices?.getArray()) {
    const previous = inverseBindMatrices.getArray();
    const next = new Float32Array(previous.length + 16);
    next.set(previous);
    next.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], previous.length);
    inverseBindMatrices.setArray(next);
  } else if (inverseBindMatrices) {
    throw new Error("Canonical skin has an unreadable inverse-bind matrix");
  }

  skin.addJoint(rig);

  // When inverse bind matrices are omitted, glTF defines them as identity.
  // No accessor needs to be synthesized in that case.
  void document;
}

function createRigHierarchy(document, height) {
  const rootBone = findRequiredNode(document, "root");
  const eyesRoot = findRequiredNode(document, "MCH-eyes_parent");
  const baseMeshNode = findRequiredNode(document, "Plane002");
  const canonicalSkin = baseMeshNode.getSkin();
  if (!canonicalSkin) {
    throw new Error('Armature node "Plane002" does not have a canonical skin');
  }

  const previousScenes = document.getRoot().listScenes();
  const previousSceneRoots = previousScenes.flatMap((scene) =>
    scene.listChildren(),
  );

  const scene = document.createScene("Scene");
  const scale = remap(Number(height), 0.5, 2, 0.7, 1.1);
  const rig = document
    .createNode("Rig")
    .setTranslation([0, 0, 0.098])
    .setRotation(quaternionFromEulerXYZ(Math.PI, 0, Math.PI))
    .setScale([scale, scale, scale]);

  rootBone.setName("root");
  eyesRoot.setName("MCH-eyes_parent");
  baseMeshNode.setName("Plane002");
  rig.addChild(rootBone).addChild(eyesRoot).addChild(baseMeshNode);
  scene.addChild(rig);

  for (const oldScene of previousScenes) {
    oldScene.dispose();
  }
  for (const oldRoot of previousSceneRoots) {
    if (
      oldRoot !== rootBone &&
      oldRoot !== eyesRoot &&
      oldRoot !== baseMeshNode
    ) {
      oldRoot.dispose();
    }
  }

  addRigToSkin(document, canonicalSkin, rig);
  return { rig, canonicalSkin };
}

/**
 * The armature's "Plane002" placeholder quad only exists to carry the
 * canonical skin; the live app never renders it. It sits ~28 m from the
 * origin in the source file, which (a) would dominate the scene-wide
 * quantization volume used by the shared pipeline and (b) shows up as a
 * stray quad in consumers that mount the whole baked scene. Shrink it to a
 * 1 mm quad at the origin: invisible, still valid non-degenerate geometry
 * (Draco refuses fully collapsed primitives), and the node keeps the mesh +
 * skin that consolidateCanonicalSkin relies on.
 */
const PLACEHOLDER_HALF_SIZE = 0.0005;

function collapsePlaceholderPlane(document) {
  const mesh = findRequiredNode(document, "Plane002").getMesh();
  if (!mesh) {
    return;
  }
  for (const primitive of mesh.listPrimitives()) {
    const position = primitive.getAttribute("POSITION");
    if (!position) {
      continue;
    }
    const count = position.getCount();
    const next = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      // Spread the vertices over a tiny square on the floor plane.
      next[index * 3] =
        index % 2 === 0 ? -PLACEHOLDER_HALF_SIZE : PLACEHOLDER_HALF_SIZE;
      next[index * 3 + 2] =
        index < 2 ? -PLACEHOLDER_HALF_SIZE : PLACEHOLDER_HALF_SIZE;
    }
    position.setArray(next);
  }
}

function parseHexColor(hex) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex));
  if (!match) {
    throw new Error(`Invalid hex color "${hex}"`);
  }
  const expanded =
    match[1].length === 3
      ? [...match[1]].map((digit) => digit + digit).join("")
      : match[1];
  return [
    Number.parseInt(expanded.slice(0, 2), 16) / 255,
    Number.parseInt(expanded.slice(2, 4), 16) / 255,
    Number.parseInt(expanded.slice(4, 6), 16) / 255,
  ];
}

function srgbChannelToLinear(channel) {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

export function hexSrgbToLinearFactor(hex) {
  const [red, green, blue] = parseHexColor(hex).map(srgbChannelToLinear);
  return [red, green, blue, 1];
}

function stripPhysicalExtensions(material) {
  for (const extensionName of PHYSICAL_MATERIAL_EXTENSIONS) {
    if (material.getExtension(extensionName)) {
      material.setExtension(extensionName, null);
    }
  }
}

function setMorphWeights(mesh, morphValues) {
  const targetNames = mesh.getExtras()?.targetNames;
  if (!Array.isArray(targetNames) || targetNames.length === 0) {
    return;
  }
  const weights = [...(mesh.getWeights() || [])];
  while (weights.length < targetNames.length) {
    weights.push(0);
  }
  for (let index = 0; index < targetNames.length; index += 1) {
    const value = morphValues[targetNames[index]];
    if (value !== undefined) {
      weights[index] = Number(value);
    }
  }
  mesh.setWeights(weights.slice(0, targetNames.length));
}

export function remapJointAccessors(
  mesh,
  assetSkin,
  canonicalSkin,
  assetLabel,
) {
  const canonicalIndexByName = new Map(
    canonicalSkin.listJoints().map((joint, index) => [joint.getName(), index]),
  );
  const indexMap = assetSkin.listJoints().map((joint) => {
    const jointName = joint.getName();
    const index = canonicalIndexByName.get(jointName);
    if (index === undefined) {
      throw new Error(
        `Joint "${jointName}" from asset "${assetLabel}" is absent from the base skeleton`,
      );
    }
    return index;
  });

  for (const primitive of mesh.listPrimitives()) {
    const joints = primitive.getAttribute("JOINTS_0");
    const previous = joints?.getArray();
    if (!joints || !previous) {
      continue;
    }
    const TypedArray = previous.constructor;
    const next = new TypedArray(previous.length);
    for (let index = 0; index < previous.length; index += 1) {
      const mapped = indexMap[previous[index]];
      if (mapped === undefined) {
        throw new Error(
          `JOINTS_0 index ${previous[index]} from asset "${assetLabel}" is outside its skin joint order`,
        );
      }
      next[index] = mapped;
    }
    joints.setArray(next);
  }
}

function copyAssetMeshes({
  document,
  assetDocument,
  asset,
  rig,
  canonicalSkin,
  skinMaterial,
  morphValues,
}) {
  for (const extension of assetDocument.getRoot().listExtensionsUsed()) {
    const targetExtension = document.createExtension(extension.constructor);
    if (extension.isRequired()) {
      targetExtension.setRequired(true);
    }
  }

  const sourceNodes = assetDocument
    .getRoot()
    .listNodes()
    .filter(
      (node) =>
        node.getMesh() &&
        !normalizeNodeName(node.getName()).includes("plane002"),
    );

  for (const sourceNode of sourceNodes) {
    const propertyMap = copyToDocument(document, assetDocument, [sourceNode]);
    const copiedNode = propertyMap.get(sourceNode);
    const copiedMesh = copiedNode.getMesh();
    const sourceSkin = sourceNode.getSkin();
    if (!copiedMesh) {
      continue;
    }

    if (sourceSkin) {
      remapJointAccessors(
        copiedMesh,
        sourceSkin,
        canonicalSkin,
        asset.assetId || asset.fileUrl || asset.categoryName,
      );
      copiedNode.setSkin(canonicalSkin);
      propertyMap.get(sourceSkin)?.dispose();
    }

    const visitedMaterials = new Set();
    for (const primitive of copiedMesh.listPrimitives()) {
      const material = primitive.getMaterial();
      if (!material) {
        continue;
      }
      if (material.getName().toLowerCase().includes("skin")) {
        primitive.setMaterial(skinMaterial);
        continue;
      }
      if (visitedMaterials.has(material)) {
        continue;
      }
      visitedMaterials.add(material);
      stripPhysicalExtensions(material);
      if (material.getName().includes("Color")) {
        const color = asset.colors?.[material.getName()] || asset.color;
        if (color) {
          material.setBaseColorFactor(hexSrgbToLinearFactor(color));
        }
      }
    }

    setMorphWeights(copiedMesh, morphValues);
    // Asset.tsx mounts each extracted geometry directly beneath Rig; source
    // node transforms are not carried onto the rendered mesh.
    copiedNode
      .setTranslation([0, 0, 0])
      .setRotation([0, 0, 0, 1])
      .setScale([1, 1, 1]);
    rig.addChild(copiedNode);
  }
}

function createSkinMaterial(document, skinColor, compositedSkinPng) {
  const material = document
    .createMaterial("Skin")
    .setRoughnessFactor(1)
    .setMetallicFactor(0);

  if (compositedSkinPng) {
    const texture = document
      .createTexture("Skin Composite")
      .setImage(compositedSkinPng)
      .setMimeType("image/png");
    material.setBaseColorTexture(texture).setBaseColorFactor([1, 1, 1, 1]);
  } else {
    material.setBaseColorFactor(hexSrgbToLinearFactor(skinColor));
  }
  return material;
}

function morphPipelineOptions(morphs) {
  return {
    visemes: morphs === "visemes" || morphs === "full",
    arkit: morphs === "arkit" || morphs === "full",
  };
}

async function applyQuality(document, quality) {
  if (quality === "high") {
    return;
  }
  const maximumTextureSize = quality === "low" ? 512 : 1024;
  const transforms = [];
  if (quality === "low") {
    transforms.push(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: 0.5,
        error: 0.001,
      }),
    );
  }
  transforms.push(
    textureCompress({
      encoder: sharp,
      resize: [maximumTextureSize, maximumTextureSize],
    }),
  );
  await document.transform(...transforms);
}

async function consolidateCanonicalSkin(document) {
  const baseMeshNode = findRequiredNode(document, "Plane002");
  const canonicalSkin = baseMeshNode.getSkin();
  if (!canonicalSkin) {
    throw new Error('Baked node "Plane002" lost its canonical skin');
  }

  const replacedSkins = new Set();
  for (const node of document.getRoot().listNodes()) {
    const skin = node.getSkin();
    const mesh = node.getMesh();
    if (!skin || !mesh || skin === canonicalSkin) {
      continue;
    }
    remapJointAccessors(mesh, skin, canonicalSkin, node.getName());
    node.setSkin(canonicalSkin);
    replacedSkins.add(skin);
  }
  for (const skin of replacedSkins) {
    skin.dispose();
  }
  if (replacedSkins.size > 0) {
    await document.transform(prune());
  }
}

/**
 * Pure assembly boundary: all bytes and recipe/variant configuration are
 * supplied by the caller. This function performs no filesystem, PB, R2, or
 * network access and returns the assembled glTF-Transform Document.
 */
export async function assemble({
  armatureBuffer,
  assets = [],
  skinColor = "#E7AF91",
  compositedSkinPng = null,
  height = 1,
  morphValues = {},
  variant,
}) {
  const io = await createNodeIO();
  const document = await io.readBinary(new Uint8Array(armatureBuffer));
  document.disposeExtension(EXTMeshoptCompression.EXTENSION_NAME);
  document.disposeExtension(KHRDracoMeshCompression.EXTENSION_NAME);

  const { rig, canonicalSkin } = createRigHierarchy(document, height);
  collapsePlaceholderPlane(document);
  const skinMaterial = createSkinMaterial(
    document,
    skinColor,
    compositedSkinPng,
  );

  for (const asset of assets) {
    const assetDocument = await io.readBinary(new Uint8Array(asset.buffer));
    assetDocument.disposeExtension(EXTMeshoptCompression.EXTENSION_NAME);
    assetDocument.disposeExtension(KHRDracoMeshCompression.EXTENSION_NAME);
    copyAssetMeshes({
      document,
      assetDocument,
      asset,
      rig,
      canonicalSkin,
      skinMaterial,
      morphValues,
    });
  }

  await document.transform(unpartition(), prune());
  await applyQuality(document, variant.quality);
  await runBakePipeline(
    document,
    {
      ...morphPipelineOptions(variant.morphs),
      optimize: true,
      compression: variant.compression,
      stripFaceBones: false,
    },
    { meshoptEncoder: MeshoptEncoder },
  );
  await consolidateCanonicalSkin(document);
  return document;
}
