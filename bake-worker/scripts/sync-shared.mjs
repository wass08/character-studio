import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const candidates = [
  path.resolve(process.cwd(), "../src/lib/bake"),
  path.resolve(process.cwd(), "shared/bake"),
];

let sourceDirectory;
for (const candidate of candidates) {
  try {
    await access(path.join(candidate, "pipeline.ts"));
    sourceDirectory = candidate;
    break;
  } catch {
    // Try the next supported repository/container layout.
  }
}

if (!sourceDirectory) {
  throw new Error(
    `Could not find shared bake sources in: ${candidates.join(", ")}`,
  );
}

const outputDirectory = path.resolve(process.cwd(), "src/generated");
await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  ["pipeline.ts", "params.js"].map((fileName) =>
    copyFile(
      path.join(sourceDirectory, fileName),
      path.join(outputDirectory, fileName),
    ),
  ),
);
