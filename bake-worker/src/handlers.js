async function handleBake(job) {
  console.log(`[bake] Starting stub for job ${job.id}`);
  throw new Error("bake pipeline not implemented yet");
}

async function handleInvalidate(pb, job) {
  if (!job.asset) {
    throw new Error("invalidate job is missing asset");
  }

  const characters = await pb
    .collection("CharacterStudioCharacters")
    .getFullList({
      batch: 200,
      filter: pb.filter("usedAssets.id ?= {:asset}", {
        asset: job.asset,
      }),
    });

  for (const character of characters) {
    await pb
      .collection("CharacterStudioCharacters")
      .update(character.id, { bakeStale: true });
  }

  console.log(
    `[invalidate] Marked ${characters.length} character(s) stale for asset ${job.asset}`,
  );
}

export async function handleJob(pb, r2, job) {
  switch (job.type) {
    case "bake":
      return handleBake(job, r2);
    case "invalidate":
      return handleInvalidate(pb, job);
    default:
      throw new Error(`Unsupported bake job type: ${job.type}`);
  }
}
