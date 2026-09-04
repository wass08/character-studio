// Enqueue helpers for the CharacterStudioBakeJobs queue consumed by
// bake-worker/. Both are best-effort: bakes are content-addressed (same
// inputs → same bakeId), so a duplicate or lost job is harmless — the next
// request or save produces the identical artifact. Callers therefore never
// fail a save because an enqueue failed.
//
// Takes `pb` as an argument instead of importing the store to stay usable
// from admin components and future server code without an import cycle.

import { DEFAULT_VARIANT_KEY } from "@/lib/bake/params";

export async function enqueueCharacterBake(pb, characterId) {
  if (!characterId) return null;
  try {
    const existing = await pb
      .collection("CharacterStudioBakeJobs")
      .getFirstListItem(
        `type = "bake" && character = "${characterId}" && (status = "queued" || status = "running")`,
        { requestKey: null },
      )
      .catch(() => null);
    if (existing) return existing;
    return await pb.collection("CharacterStudioBakeJobs").create(
      {
        type: "bake",
        character: characterId,
        variantKey: DEFAULT_VARIANT_KEY,
        dedupKey: `${characterId}:${DEFAULT_VARIANT_KEY}`,
        status: "queued",
        attempts: 0,
      },
      { requestKey: null },
    );
  } catch (err) {
    console.warn("Bake enqueue failed (non-fatal):", err?.message || err);
    return null;
  }
}

/**
 * Enqueue a specific variant. Pass `bakeId` (PB record id of a
 * CharacterStudioBakes row) to generate a variant of that frozen bake's
 * recipe (pinned /b/ URLs); pass only `characterId` to bake the character's
 * current recipe (advances latestBake).
 */
export async function enqueueVariantBake(
  pb,
  { characterId, bakeId, variantKey },
) {
  if (!characterId && !bakeId) return null;
  const key = variantKey || DEFAULT_VARIANT_KEY;
  const dedupKey = `${bakeId || characterId}:${key}`;
  try {
    const existing = await pb
      .collection("CharacterStudioBakeJobs")
      .getFirstListItem(
        pb.filter(
          'type = "bake" && dedupKey = {:dedupKey} && (status = "queued" || status = "running")',
          { dedupKey },
        ),
        { requestKey: null },
      )
      .catch(() => null);
    if (existing) return existing;
    return await pb.collection("CharacterStudioBakeJobs").create(
      {
        type: "bake",
        character: characterId || "",
        bake: bakeId || "",
        variantKey: key,
        dedupKey,
        status: "queued",
        attempts: 0,
      },
      { requestKey: null },
    );
  } catch (err) {
    console.warn(
      "Variant bake enqueue failed (non-fatal):",
      err?.message || err,
    );
    return null;
  }
}

export async function enqueueAssetInvalidation(pb, assetId) {
  if (!assetId) return null;
  try {
    const existing = await pb
      .collection("CharacterStudioBakeJobs")
      .getFirstListItem(
        `type = "invalidate" && asset = "${assetId}" && (status = "queued" || status = "running")`,
        { requestKey: null },
      )
      .catch(() => null);
    if (existing) return existing;
    return await pb.collection("CharacterStudioBakeJobs").create(
      {
        type: "invalidate",
        asset: assetId,
        dedupKey: `invalidate:${assetId}`,
        status: "queued",
        attempts: 0,
      },
      { requestKey: null },
    );
  } catch (err) {
    console.warn(
      "Invalidation enqueue failed (non-fatal):",
      err?.message || err,
    );
    return null;
  }
}
