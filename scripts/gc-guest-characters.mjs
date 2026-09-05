// Garbage-collect unclaimed guest characters, never bakes. Bakes are
// immutable, and externally delivered ones must be retained forever.
//
//   npm run guests:gc                 # dry run, older than 30 days
//   npm run guests:gc -- --days 45    # override retention with --days N
//   npm run guests:gc -- --apply      # delete matching characters
//
// --days N: positive number of days to retain (default 30).
// --apply: actually delete; without this flag, only list candidates.
// Needs superuser credentials in .env (NEXT_PUBLIC_POCKETBASE_URL,
// POCKETBASE_EMAIL, POCKETBASE_PASSWORD).

import dotenv from "dotenv";
import PocketBase from "pocketbase";

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const args = process.argv.slice(2);
let days = 30;
let apply = false;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--apply") {
    apply = true;
  } else if (arg === "--days") {
    days = Number(args[index + 1]);
    if (!Number.isFinite(days) || days <= 0)
      throw new Error("--days requires a positive number.");
    index += 1;
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  .toISOString()
  .replace("T", " ")
  .slice(0, 19);

const pb = new PocketBase(required("NEXT_PUBLIC_POCKETBASE_URL"));
pb.autoCancellation(false);
await pb
  .collection("_superusers")
  .authWithPassword(
    required("POCKETBASE_EMAIL"),
    required("POCKETBASE_PASSWORD"),
  );

const characters = await pb
  .collection("CharacterStudioCharacters")
  .getFullList({
    filter: `guest = true && user = "" && created < "${cutoff}"`,
    sort: "created",
    requestKey: null,
  });

for (const character of characters) {
  console.log(
    `${character.id}\t${JSON.stringify(character.name || "Untitled")}\t${character.created}`,
  );
}
console.log(
  `${apply ? "Apply" : "Dry run"}: ${characters.length} unclaimed guest character(s) created before ${cutoff} UTC.`,
);

if (!apply) process.exit(0);

let deleted = 0;
let failed = 0;
for (const character of characters) {
  try {
    await pb.collection("CharacterStudioCharacters").delete(character.id);
    deleted += 1;
  } catch (error) {
    failed += 1;
    console.error(`  ! ${character.id}: ${error?.message || String(error)}`);
  }
}

console.log(`Deleted ${deleted} character(s); failed ${failed}.`);
process.exit(failed > 0 ? 1 : 0);
