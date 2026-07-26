import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_ENV_VARS = [
  "POCKETBASE_URL",
  "POCKETBASE_EMAIL",
  "POCKETBASE_PASSWORD",
  "R2_ENDPOINT",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_URL",
];

const WORKER_DIRECTORY = fileURLToPath(new URL("..", import.meta.url));

function readPositiveInteger(name, defaultValue) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue.trim() === "") {
    return defaultValue;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

export function loadConfig() {
  const missing = REQUIRED_ENV_VARS.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    pocketBaseUrl: process.env.POCKETBASE_URL,
    pocketBaseEmail: process.env.POCKETBASE_EMAIL,
    pocketBasePassword: process.env.POCKETBASE_PASSWORD,
    r2Endpoint: process.env.R2_ENDPOINT,
    r2Bucket: process.env.R2_BUCKET,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    r2PublicUrl: process.env.R2_PUBLIC_URL,
    modelsDir: path.resolve(
      WORKER_DIRECTORY,
      process.env.MODELS_DIR?.trim() || "../public/models/characters",
    ),
    port: readPositiveInteger("PORT", 8787),
    concurrency: readPositiveInteger("CONCURRENCY", 2),
    pollIntervalMs: readPositiveInteger("POLL_INTERVAL_MS", 2000),
  };
}
