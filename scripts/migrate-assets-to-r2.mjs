// Move CharacterStudioAssets files that are still served by PocketBase
// (`url` set, `r2Url` empty) to the R2 bucket behind the CDN, and point the
// record's `r2Url` at the copy. Every consumer (editor, wall, bake worker)
// already prefers `r2Url`, so nothing else changes; the PocketBase file is
// left in place as a fallback.
//
//   npm run assets:migrate            # dry run: list what would move
//   npm run assets:migrate -- --apply # upload + update records
//
// Keys follow the admin uploader's convention:
//   assets/models/<unix ms>-<6 random chars>-<original file name>
// Objects get immutable cache headers (keys are unique per upload).

import { randomBytes } from "node:crypto";
import path from "node:path";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import PocketBase from "pocketbase";

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const apply = process.argv.includes("--apply");
const CONTENT_TYPES = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const pbUrl = required("NEXT_PUBLIC_POCKETBASE_URL").replace(/\/+$/, "");
const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);
await pb
  .collection("_superusers")
  .authWithPassword(
    required("POCKETBASE_EMAIL"),
    required("POCKETBASE_PASSWORD"),
  );

const bucket = required("R2_BUCKET");
let publicBase = required("R2_PUBLIC_URL").trim().replace(/\/+$/, "");
if (!/^https?:\/\//i.test(publicBase)) publicBase = `https://${publicBase}`;
const s3 = new S3Client({
  region: "auto",
  endpoint: required("R2_ENDPOINT"),
  credentials: {
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  },
});

const pending = await pb.collection("CharacterStudioAssets").getFullList({
  filter: 'r2Url = "" && url != ""',
  sort: "created",
  requestKey: null,
});
console.log(
  `${pending.length} asset(s) still served by PocketBase${apply ? "" : " (dry run, pass --apply to migrate)"}.`,
);

let moved = 0;
let failed = 0;
for (const asset of pending) {
  const source = `${pbUrl}/api/files/${asset.collectionId}/${asset.id}/${asset.url}`;
  const ext = path.extname(asset.url).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
  const safeName = asset.url.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `assets/models/${Date.now()}-${randomBytes(4).toString("hex").slice(0, 6)}-${safeName}`;
  const publicUrl = `${publicBase}/${key}`;
  console.log(`- ${asset.id} ${asset.name} (${asset.url}) -> ${key}`);
  if (!apply) continue;
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`download ${response.status}`);
    const body = Buffer.from(await response.arrayBuffer());
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const check = await fetch(publicUrl, { method: "HEAD" });
    if (!check.ok) throw new Error(`public URL returned ${check.status}`);
    await pb
      .collection("CharacterStudioAssets")
      .update(asset.id, { r2Url: publicUrl }, { requestKey: null });
    moved += 1;
    console.log(`    ✔ ${(body.length / 1024).toFixed(0)} KB, ${publicUrl}`);
  } catch (error) {
    failed += 1;
    console.error(`    ✘ ${error?.message || error}`);
  }
}

if (apply) console.log(`Moved ${moved} asset(s); failed ${failed}.`);
process.exit(failed > 0 ? 1 : 0);
