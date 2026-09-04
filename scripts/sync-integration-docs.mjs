// Publish docs/integration/character-studio-glb.md as public/llms.txt so the
// deployed app serves the integration contract at a stable URL agents can
// fetch. Runs on `prebuild`; commit the output so it is also in the repo.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(ROOT, "docs/integration/character-studio-glb.md");
const target = path.join(ROOT, "public/llms.txt");

const markdown = await readFile(source, "utf8");
const banner = `<!-- Generated from docs/integration/character-studio-glb.md by scripts/sync-integration-docs.mjs. Edit the source, not this file. -->\n\n`;
await writeFile(target, banner + markdown);
console.log(`wrote ${path.relative(ROOT, target)} (${markdown.length} chars)`);
