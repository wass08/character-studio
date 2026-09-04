/// <reference lib="webworker" />

// Web Worker — runs the gltf-transform pipeline off the main thread so the
// renderer keeps rendering smoothly while we bake morphs, strip bones,
// optimize and Draco-compress the GLB.
//
// Protocol:
//   main → worker: { id, glb: Uint8Array, options: { visemes, arkit, optimize, compression } }
//   worker → main: { id, ok: true, result: Uint8Array }
//                  { id, ok: false, error: string }

import { NodeIO, VertexLayout } from "@gltf-transform/core";
import {
  EXTMeshoptCompression,
  KHRDracoMeshCompression,
} from "@gltf-transform/extensions";
import { MeshoptEncoder } from "meshoptimizer";
import { runBakePipeline } from "../../lib/bake/pipeline";

type Compression = "none" | "draco" | "meshopt";

type ExportRequest = {
  id: number;
  glb: Uint8Array;
  options: {
    visemes?: boolean;
    arkit?: boolean;
    optimize?: boolean;
    compression?: Compression;
  };
};

type ExportResponse =
  | { id: number; ok: true; result: Uint8Array }
  | { id: number; ok: false; error: string };

declare const self: DedicatedWorkerGlobalScope;

// Same-origin Draco. We copied draco3d's universal Emscripten builds (encoder
// + decoder + WASM) into /public/draco/ at install time. Cross-origin CDNs
// (gstatic, unpkg) either don't host the encoder or don't set CORS headers
// that allow `fetch()` from a worker; serving the files ourselves sidesteps
// both problems.
//
// Resolved against `self.location.origin` because the worker is bundled into
// `/_next/static/chunks/...` and a bare `/draco/...` would otherwise fail to
// parse as a URL inside the worker context.
const DRACO_CDN = `${self.location.origin}/draco/`;

// `new Function()` compiles a function whose body is a literal string; the
// bundler (Turbopack) can't analyse `return import(url)` inside it, so the
// dynamic import lands on the browser's native loader instead of getting
// rewritten into a CJS-shim that rejects blob URLs as "Cannot find module
// 'unknown'".
type DynamicImporter = (url: string) => Promise<{ default: unknown }>;
const rawDynamicImport = new Function(
  "url",
  "return import(url);",
) as DynamicImporter;

// Lazy WASM warm-up — done once per worker.
type MeshoptEncoderModule = typeof MeshoptEncoder;
let meshoptReady: Promise<MeshoptEncoderModule> | null = null;
function getMeshoptEncoder(): Promise<MeshoptEncoderModule> {
  if (!meshoptReady) {
    meshoptReady = MeshoptEncoder.ready.then(() => MeshoptEncoder);
  }
  return meshoptReady;
}

// Emscripten module factories are untyped runtime constructs; the encoder/
// decoder instances they return are passed back into gltf-transform without
// further inspection from this file.
type DracoFactory = (config: {
  locateFile: (file: string) => string;
}) => Promise<unknown>;

// Load a Draco Emscripten module factory from gstatic by fetching the script
// text, wrapping it as an ES module that re-exports the global the script
// declares (e.g. `DracoEncoderModule`), and dynamically importing the result
// via a blob URL.
//
// The wrapper deliberately shadows `importScripts`, `require`, and `process`:
//   - This is a *module* worker, so it lacks a real `importScripts` — but
//     Emscripten uses `typeof importScripts === "function"` to decide whether
//     it's in a Web Worker. We stub it to flip the detection ON.
//   - Turbopack injects a `process` shim into worker globals (so
//     `process.env.NODE_ENV` works in Next.js code). Emscripten interprets
//     that as "we're in Node" and tries to `require('fs')`, which the
//     bundler's runtime then rejects with "Cannot find module 'unknown'". We
//     shadow both `process` and `require` to keep Emscripten on the Web
//     Worker code path, which loads the WASM via fetch + `locateFile`.
async function loadDracoFactory(
  scriptName: string,
  globalName: string,
): Promise<DracoFactory> {
  const code = await fetch(DRACO_CDN + scriptName).then((res) => {
    if (!res.ok) {
      throw new Error(
        `Failed to fetch Draco ${scriptName} (HTTP ${res.status})`,
      );
    }
    return res.text();
  });
  const wrapped = [
    "const importScripts = () => {};",
    "const require = undefined;",
    "const process = undefined;",
    code,
    `export default ${globalName};`,
  ].join("\n");
  const blobUrl = URL.createObjectURL(
    new Blob([wrapped], { type: "application/javascript" }),
  );
  try {
    const mod = await rawDynamicImport(blobUrl);
    return mod.default as DracoFactory;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

let dracoModulesPromise: Promise<{
  encoder: unknown;
  decoder: unknown;
}> | null = null;
function getDracoModules() {
  if (!dracoModulesPromise) {
    dracoModulesPromise = (async () => {
      const locateFile = (file: string) => DRACO_CDN + file;
      const [encoderFactory, decoderFactory] = await Promise.all([
        loadDracoFactory("draco_encoder.js", "DracoEncoderModule"),
        loadDracoFactory("draco_decoder.js", "DracoDecoderModule"),
      ]);
      const [encoder, decoder] = await Promise.all([
        encoderFactory({ locateFile }),
        decoderFactory({ locateFile }),
      ]);
      return { encoder, decoder };
    })();
  }
  return dracoModulesPromise;
}

// Build a NodeIO with both compression extensions registered. The MeshoptEncoder
// is wired up eagerly (it ships with the meshoptimizer package and warms
// quickly); the Draco encoder/decoder are wired up on demand the first time
// a Draco export is requested, since fetching them takes a network round-trip.
let ioPromise: Promise<NodeIO> | null = null;
async function getIO(compression: Compression): Promise<NodeIO> {
  if (!ioPromise) {
    ioPromise = getMeshoptEncoder().then((encoder) =>
      new NodeIO()
        .registerExtensions([EXTMeshoptCompression, KHRDracoMeshCompression])
        .registerDependencies({ "meshopt.encoder": encoder })
        // One buffer view per attribute, like the bake worker: interleaving
        // non-normalized Uint8 JOINTS_0 with normalized Uint8 WEIGHTS_0 makes
        // three.js' WebGPU backend request an invalid "unorm32x4" vertex
        // format for uncompressed files and kills the whole render pipeline.
        .setVertexLayout(VertexLayout.SEPARATE),
    );
  }
  const io = await ioPromise;
  if (compression === "draco") {
    const { encoder, decoder } = await getDracoModules();
    io.registerDependencies({
      "draco3d.encoder": encoder,
      "draco3d.decoder": decoder,
    });
  }
  return io;
}

self.onmessage = async (e: MessageEvent<ExportRequest>) => {
  const { id, glb, options } = e.data;
  const {
    visemes = false,
    arkit = false,
    optimize = true,
    compression = "meshopt",
  } = options;

  try {
    const io = await getIO(compression);
    const doc = await io.readBinary(glb);

    await runBakePipeline(
      doc,
      { visemes, arkit, optimize, compression },
      { meshoptEncoder: await getMeshoptEncoder() },
    );

    const result = await io.writeBinary(doc);
    const response: ExportResponse = { id, ok: true, result };
    self.postMessage(response, [result.buffer as ArrayBuffer]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err ?? "Unknown error");
    const response: ExportResponse = { id, ok: false, error: message };
    self.postMessage(response);
  }
};
