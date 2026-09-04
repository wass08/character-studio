// Re-bake every character (or the ids passed as arguments) through the
// production bake worker.
//
//   npm run bake:all              # all characters, wait for the jobs
//   npm run bake:all -- <id> <id> # only these characters
//   npm run bake:all -- --no-wait # enqueue and exit
//
// For each character this backfills `usedAssets` from the recipe (records
// saved before the bake pipeline existed have it empty, so asset-edit
// invalidation cannot find them), marks it stale, and enqueues the default
// variant. Jobs are deduplicated against queued/running ones. Bakes are
// content-addressed, so a re-run for an unchanged recipe on the same
// PIPELINE_VERSION is a no-op for the worker.
//
// Needs superuser credentials in .env (NEXT_PUBLIC_POCKETBASE_URL,
// POCKETBASE_EMAIL, POCKETBASE_PASSWORD).

import dotenv from "dotenv";
import PocketBase from "pocketbase";
import { PIPELINE_VERSION } from "../bake-worker/src/recipes.js";
import { DEFAULT_VARIANT_KEY } from "../src/lib/bake/params.js";

dotenv.config();

const POLL_INTERVAL_MS = 3000;
const WAIT_TIMEOUT_MS = 15 * 60 * 1000;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const args = process.argv.slice(2);
const wait = !args.includes("--no-wait");
const onlyIds = new Set(args.filter((arg) => !arg.startsWith("--")));

const pb = new PocketBase(required("NEXT_PUBLIC_POCKETBASE_URL"));
pb.autoCancellation(false);
await pb
  .collection("_superusers")
  .authWithPassword(
    required("POCKETBASE_EMAIL"),
    required("POCKETBASE_PASSWORD"),
  );

const characters = (
  await pb
    .collection("CharacterStudioCharacters")
    .getFullList({ sort: "created", requestKey: null })
).filter((character) => onlyIds.size === 0 || onlyIds.has(character.id));

if (characters.length === 0) {
  console.log("No characters matched.");
  process.exit(0);
}

const jobs = new Map(); // characterId -> job record
const backfillFailed = new Map(); // characterId -> error message
for (const character of characters) {
  const usedAssets = [
    ...new Set(
      Object.values(character.customization || {})
        .map((slot) => slot?.assetId)
        .filter(Boolean),
    ),
  ];
  try {
    await pb
      .collection("CharacterStudioCharacters")
      .update(
        character.id,
        { usedAssets, bakeStale: true },
        { requestKey: null },
      );
  } catch (error) {
    // A recipe can reference an asset that was deleted since; the bake
    // worker resolves assets itself, so keep going without the backfill.
    const message = error?.message || String(error);
    backfillFailed.set(character.id, message);
    console.warn(
      `  ! ${character.name || character.id}: usedAssets backfill failed (${message})`,
    );
    await pb
      .collection("CharacterStudioCharacters")
      .update(character.id, { bakeStale: true }, { requestKey: null })
      .catch((staleError) => {
        backfillFailed.set(
          character.id,
          `${message}; bakeStale update also failed (${staleError?.message || staleError})`,
        );
      });
  }

  const dedupKey = `${character.id}:${DEFAULT_VARIANT_KEY}`;
  let job = await pb
    .collection("CharacterStudioBakeJobs")
    .getFirstListItem(
      pb.filter(
        'type = "bake" && dedupKey = {:dedupKey} && (status = "queued" || status = "running")',
        { dedupKey },
      ),
      { requestKey: null },
    )
    .catch(() => null);
  if (!job) {
    job = await pb.collection("CharacterStudioBakeJobs").create(
      {
        type: "bake",
        character: character.id,
        variantKey: DEFAULT_VARIANT_KEY,
        dedupKey,
        status: "queued",
        attempts: 0,
      },
      { requestKey: null },
    );
  }
  jobs.set(character.id, job);
  console.log(
    `  queued ${character.name || "Untitled"} (${character.id}) job=${job.id} usedAssets=${usedAssets.length}`,
  );
}

if (!wait) {
  console.log(`Enqueued ${jobs.size} bake job(s).`);
  process.exit(0);
}

const deadline = Date.now() + WAIT_TIMEOUT_MS;
const pending = new Set(jobs.keys());
while (pending.size > 0 && Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  for (const characterId of [...pending]) {
    const job = await pb
      .collection("CharacterStudioBakeJobs")
      .getOne(jobs.get(characterId).id, { requestKey: null })
      .catch(() => null);
    if (!job) continue;
    jobs.set(characterId, job);
    if (job.status === "done" || job.status === "error")
      pending.delete(characterId);
  }
  process.stdout.write(
    `  waiting… ${jobs.size - pending.size}/${jobs.size} finished\r`,
  );
}
process.stdout.write("\n");

let failures = 0;
for (const character of characters) {
  const job = jobs.get(character.id);
  const record = await pb
    .collection("CharacterStudioCharacters")
    .getOne(character.id, { expand: "latestBake", requestKey: null });
  const bake = record.expand?.latestBake;
  const variant = bake?.variants?.[DEFAULT_VARIANT_KEY];
  const problems = [];
  if (job.status !== "done") problems.push(`job ${job.status}`);
  if (bake?.status !== "ready" || !variant)
    problems.push("no ready default variant");
  // The pointer only advances after a successful bake, so an old version here
  // means the deployed worker is still running older code than this checkout.
  if (bake && bake.pipelineVersion !== PIPELINE_VERSION)
    problems.push(
      `bake is pipeline ${bake.pipelineVersion}, expected ${PIPELINE_VERSION} (worker outdated?)`,
    );
  if (backfillFailed.has(character.id))
    problems.push(
      `usedAssets backfill failed: ${backfillFailed.get(character.id)}`,
    );
  if (job.error) problems.push(`error: ${job.error}`);
  const ok = problems.length === 0;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "✔" : "✘"} ${(character.name || "Untitled").padEnd(18)} bake=${bake?.bakeId || "-"} v${bake?.pipelineVersion || "-"} ${variant ? `${(variant.size / 1e6).toFixed(2)} MB` : ""}${ok ? "" : ` — ${problems.join("; ")}`}`,
  );
}
if (pending.size > 0)
  console.log(`Timed out waiting for ${pending.size} job(s).`);
console.log(
  failures === 0 && pending.size === 0
    ? `All ${characters.length} character(s) baked with pipeline ${PIPELINE_VERSION}.`
    : `${failures} character(s) need attention.`,
);
process.exit(failures > 0 || pending.size > 0 ? 1 : 0);
