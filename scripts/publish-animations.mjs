import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, resample } from "@gltf-transform/functions";
import dotenv from "dotenv";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const MANIFEST_PATH = path.join(
  REPOSITORY_ROOT,
  "src/lib/generated/animation-assets.json",
);
const UPLOAD = process.argv.includes("--upload");
const TOLERANCE = 1e-3;
const GENDERS = ["man", "woman"];

dotenv.config({ path: path.join(REPOSITORY_ROOT, ".env"), quiet: true });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function createIO() {
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
}

function animationStats(document) {
  const animations = document.getRoot().listAnimations();
  return {
    clips: animations.length,
    channels: animations.reduce(
      (sum, animation) => sum + animation.listChannels().length,
      0,
    ),
  };
}

async function optimizeAnimation(gender, outputDirectory) {
  const sourcePath = path.join(
    REPOSITORY_ROOT,
    "public/models/characters",
    gender,
    "Animations.glb",
  );
  const source = await readFile(sourcePath);
  const io = createIO();
  const document = await io.readBinary(new Uint8Array(source));
  const before = animationStats(document);

  await document.transform(
    resample({ tolerance: TOLERANCE }),
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
  );

  const after = animationStats(document);
  if (after.clips !== before.clips || after.channels !== before.channels) {
    throw new Error(
      `${gender}: animation structure changed (${before.clips}/${before.channels} -> ${after.clips}/${after.channels})`,
    );
  }

  const output = await io.writeBinary(document);
  const digest = sha256(output);
  const outputPath = path.join(outputDirectory, `${gender}-${digest}.glb`);
  await writeFile(outputPath, output);

  // Decode the final Meshopt payload once before publishing it.
  const validation = await createIO().readBinary(output);
  const validated = animationStats(validation);
  if (
    validated.clips !== before.clips ||
    validated.channels !== before.channels
  ) {
    throw new Error(
      `${gender}: published payload failed structural validation`,
    );
  }

  return {
    gender,
    output,
    sourceBytes: source.byteLength,
    bytes: output.byteLength,
    sha256: digest,
    key: `animations/${gender}/${digest}.glb`,
    localUrl: `/models/characters/${gender}/Animations.glb`,
  };
}

async function uploadAnimations(results) {
  const client = new S3Client({
    region: "auto",
    endpoint: required("R2_ENDPOINT"),
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  });
  const bucket = required("R2_BUCKET");

  for (const result of results) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: result.key,
        Body: result.output,
        ContentType: "model/gltf-binary",
        CacheControl: "public, max-age=31536000, immutable",
        Metadata: { sha256: result.sha256 },
      }),
    );
  }
}

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const outputDirectory = await mkdtemp(
  path.join(os.tmpdir(), "character-studio-animations-"),
);

try {
  const results = [];
  for (const gender of GENDERS) {
    const result = await optimizeAnimation(gender, outputDirectory);
    results.push(result);
    console.log(
      `${gender}: ${result.sourceBytes} -> ${result.bytes} bytes (${(
        (result.bytes / result.sourceBytes) * 100
      ).toFixed(1)}%)`,
    );
  }

  if (!UPLOAD) {
    console.log(
      "Dry run complete. Pass --upload to publish and update the manifest.",
    );
    process.exitCode = 0;
  } else {
    await uploadAnimations(results);
    const manifest = Object.fromEntries(
      results.map(({ output: _output, gender, ...asset }) => [gender, asset]),
    );
    await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(
      `Published ${results.length} animation libraries and updated the manifest.`,
    );
  }
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}
