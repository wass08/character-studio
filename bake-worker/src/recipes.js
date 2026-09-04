import { createHash } from "node:crypto";

// Bump whenever bake output changes for identical inputs; existing bakes keep
// their old bakeId and consumers re-bake lazily (or via scripts/rebake-characters.mjs).
//   1.1.0 — scene-wide quantization volume (fixes scattered skinned meshes),
//           separate vertex layout, collapsed placeholder plane.
export const PIPELINE_VERSION = "1.1.0";

export function buildRecipe(character) {
  return {
    gender: character.gender,
    height: character.height,
    customization: character.customization || {},
    morphValues: character.morphValues || {},
  };
}

function sortRecursively(value) {
  if (Array.isArray(value)) {
    return value.map(sortRecursively);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, sortRecursively(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(sortRecursively(value));
}

export function computeBakeId(recipe, assetVersions) {
  const input = {
    recipe,
    assetVersions: [...assetVersions].sort(),
    pipelineVersion: PIPELINE_VERSION,
  };
  return createHash("sha256")
    .update(canonicalJson(input))
    .digest("hex")
    .slice(0, 24);
}

export function resolveAssetFileUrl(asset, pocketBaseUrl) {
  if (asset.r2Url) {
    return asset.r2Url;
  }
  if (!asset.url) {
    return null;
  }
  const baseUrl = pocketBaseUrl.replace(/\/+$/, "");
  return `${baseUrl}/api/files/${asset.collectionId}/${asset.id}/${asset.url}`;
}

export async function resolveRecipeAssets(pb, recipe, pocketBaseUrl) {
  const entries = Object.entries(recipe.customization || {}).filter(
    ([, selection]) => selection?.assetId,
  );

  return Promise.all(
    entries.map(async ([categoryName, selection]) => {
      const asset = await pb
        .collection("CharacterStudioAssets")
        .getOne(selection.assetId, { requestKey: null });
      const fileUrl = resolveAssetFileUrl(asset, pocketBaseUrl);
      if (!fileUrl) {
        throw new Error(
          `Asset ${selection.assetId} in ${categoryName} has no file URL`,
        );
      }
      return {
        categoryName,
        assetId: selection.assetId,
        color: selection.color || null,
        colors: selection.colors || {},
        asset,
        fileUrl,
      };
    }),
  );
}
