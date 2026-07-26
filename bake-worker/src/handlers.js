import { readFile } from "node:fs/promises";
import path from "node:path";

import { assemble, createNodeIO } from "./assemble.js";
import {
  canonicalizeBakeParams,
  DEFAULT_VARIANT_KEY,
  variantKeyFor,
  variantObjectKey,
} from "./generated/params.js";
import {
  buildRecipe,
  computeBakeId,
  PIPELINE_VERSION,
  resolveRecipeAssets,
} from "./recipes.js";
import { compositeSkin } from "./skin.js";

const BAKES_COLLECTION = "CharacterStudioBakes";
const CHARACTERS_COLLECTION = "CharacterStudioCharacters";
const IMAGE_ASSET_PATTERN = /\.(png|jpe?g|webp)$/i;
const GLB_ASSET_PATTERN = /\.glb$/i;
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function parseVariantKey(variantKey) {
  const parsed = canonicalizeBakeParams(
    Object.fromEntries(new URLSearchParams(variantKey)),
  );
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  const canonicalKey = variantKeyFor(parsed.params);
  if (canonicalKey !== variantKey) {
    throw new Error(
      `Variant key is not canonical: expected "${canonicalKey}", received "${variantKey}"`,
    );
  }
  return parsed.params;
}

async function fetchBytes(url, assetId) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Could not fetch asset "${assetId}" (${response.status} ${response.statusText})`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

async function loadAssemblyInputs(r2, recipe, resolvedAssets) {
  const armaturePath = path.join(
    r2.config.modelsDir,
    recipe.gender,
    "Armature.glb",
  );
  const armatureBuffer = await readFile(armaturePath);
  const hydratedAssets = await Promise.all(
    resolvedAssets.map(async (asset) => ({
      ...asset,
      buffer: await fetchBytes(asset.fileUrl, asset.assetId),
    })),
  );
  const makeupBuffers = hydratedAssets
    .filter((asset) => IMAGE_ASSET_PATTERN.test(asset.fileUrl))
    .map((asset) => asset.buffer);
  const modelAssets = hydratedAssets.filter((asset) =>
    GLB_ASSET_PATTERN.test(asset.fileUrl),
  );
  const skinColor = recipe.customization?.Skin?.color || "#E7AF91";
  const compositedSkinPng = await compositeSkin(makeupBuffers, skinColor);

  return {
    armatureBuffer,
    assets: modelAssets,
    skinColor,
    compositedSkinPng,
  };
}

async function findBakeByBakeId(pb, bakeId) {
  try {
    return await pb
      .collection(BAKES_COLLECTION)
      .getFirstListItem(pb.filter("bakeId = {:bakeId}", { bakeId }), {
        requestKey: null,
      });
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function findOrCreateBake(pb, character, recipe, bakeId) {
  const existing = await findBakeByBakeId(pb, bakeId);
  if (existing) {
    return existing;
  }

  try {
    return await pb.collection(BAKES_COLLECTION).create(
      {
        character: character.id,
        bakeId,
        pipelineVersion: PIPELINE_VERSION,
        recipe,
        variants: {},
        status: "pending",
        error: "",
      },
      { requestKey: null },
    );
  } catch (error) {
    // Concurrent content-identical jobs may race the unique bakeId index.
    const racedBake = await findBakeByBakeId(pb, bakeId);
    if (racedBake) {
      return racedBake;
    }
    throw error;
  }
}

async function mergeReadyVariant(pb, bake, variantKey, key, size) {
  const latest = await pb
    .collection(BAKES_COLLECTION)
    .getOne(bake.id, { requestKey: null });
  return pb.collection(BAKES_COLLECTION).update(
    bake.id,
    {
      variants: {
        ...(latest.variants || {}),
        [variantKey]: { key, size },
      },
      status: "ready",
      error: "",
    },
    { requestKey: null },
  );
}

async function markBakeError(pb, bake, error) {
  if (!bake) {
    return;
  }
  await pb
    .collection(BAKES_COLLECTION)
    .update(
      bake.id,
      { status: "error", error: errorMessage(error).slice(0, 500) },
      { requestKey: null },
    )
    .catch(() => {});
}

async function generateVariant({
  pb,
  r2,
  bake,
  recipe,
  resolvedAssets,
  variantKey,
  variant,
}) {
  const latest = await pb
    .collection(BAKES_COLLECTION)
    .getOne(bake.id, { requestKey: null });
  if (latest.variants?.[variantKey]) {
    if (latest.status === "ready" && !latest.error) {
      return latest;
    }
    return pb
      .collection(BAKES_COLLECTION)
      .update(
        bake.id,
        { status: "ready", error: "" },
        { requestKey: null },
      );
  }

  const assemblyInputs = await loadAssemblyInputs(r2, recipe, resolvedAssets);
  const document = await assemble({
    ...assemblyInputs,
    height: recipe.height,
    morphValues: recipe.morphValues || {},
    variant,
  });
  const io = await createNodeIO();
  const output = await io.writeBinary(document);
  const key = variantObjectKey(bake.bakeId, variantKey);
  await r2.putObject(
    key,
    output,
    "model/gltf-binary",
    IMMUTABLE_CACHE_CONTROL,
  );
  return mergeReadyVariant(pb, bake, variantKey, key, output.byteLength);
}

export async function handleBake(pb, r2, job) {
  const variantKey = job.variantKey || DEFAULT_VARIANT_KEY;
  const variant = parseVariantKey(variantKey);
  let bake;

  try {
    if (job.bake) {
      bake = await pb
        .collection(BAKES_COLLECTION)
        .getOne(job.bake, { requestKey: null });
      const recipe = bake.recipe;
      const resolvedAssets = await resolveRecipeAssets(
        pb,
        recipe,
        r2.config.pocketBaseUrl,
      );
      await generateVariant({
        pb,
        r2,
        bake,
        recipe,
        resolvedAssets,
        variantKey,
        variant,
      });
      console.log(
        `[bake] Generated frozen bake ${bake.bakeId} variant ${variantKey}`,
      );
      return;
    }

    if (!job.character) {
      throw new Error("bake job is missing character or bake");
    }
    const character = await pb
      .collection(CHARACTERS_COLLECTION)
      .getOne(job.character, { requestKey: null });
    const recipe = buildRecipe(character);
    const resolvedAssets = await resolveRecipeAssets(
      pb,
      recipe,
      r2.config.pocketBaseUrl,
    );
    const bakeId = computeBakeId(
      recipe,
      resolvedAssets.map((asset) => asset.fileUrl),
    );
    bake = await findOrCreateBake(pb, character, recipe, bakeId);
    await generateVariant({
      pb,
      r2,
      bake,
      recipe,
      resolvedAssets,
      variantKey,
      variant,
    });
    await pb.collection(CHARACTERS_COLLECTION).update(
      character.id,
      {
        latestBake: bake.id,
        bakeStale: false,
      },
      { requestKey: null },
    );
    console.log(`[bake] Generated ${bakeId} variant ${variantKey}`);
  } catch (error) {
    await markBakeError(pb, bake, error);
    throw error;
  }
}

async function handleInvalidate(pb, job) {
  if (!job.asset) {
    throw new Error("invalidate job is missing asset");
  }

  const characters = await pb
    .collection(CHARACTERS_COLLECTION)
    .getFullList({
      batch: 200,
      filter: pb.filter("usedAssets.id ?= {:asset}", {
        asset: job.asset,
      }),
    });

  for (const character of characters) {
    await pb
      .collection(CHARACTERS_COLLECTION)
      .update(character.id, { bakeStale: true });
  }

  console.log(
    `[invalidate] Marked ${characters.length} character(s) stale for asset ${job.asset}`,
  );
}

export async function handleJob(pb, r2, job) {
  switch (job.type) {
    case "bake":
      return handleBake(pb, r2, job);
    case "invalidate":
      return handleInvalidate(pb, job);
    default:
      throw new Error(`Unsupported bake job type: ${job.type}`);
  }
}
