import http from "node:http";

import { loadConfig } from "./config.js";
import { createPocketBase } from "./pb.js";
import { createQueue } from "./queue.js";
import { createR2 } from "./r2.js";

async function main() {
  const config = loadConfig();
  const { pb, ensureAuth } = await createPocketBase(config);
  const r2 = createR2(config);
  const queue = createQueue({
    pb,
    ensureAuth,
    r2,
    concurrency: config.concurrency,
    pollIntervalMs: config.pollIntervalMs,
  });

  const server = http.createServer((request, response) => {
    if (request.method === "GET" && request.url === "/healthz") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ok: true,
          uptime: process.uptime(),
          jobsInFlight: queue.jobsInFlight,
          lastPollAt: queue.lastPollAt,
        }),
      );
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not found" }));
  });

  server.listen(config.port, () => {
    console.log(`[server] Health endpoint listening on port ${config.port}`);
  });
  queue.start();

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`[shutdown] Received ${signal}; draining jobs`);

    server.close();
    server.closeIdleConnections();
    const { timedOut } = await queue.stop(30_000);
    if (timedOut) {
      console.warn("[shutdown] Timed out after 30 seconds waiting for jobs");
    }
    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[startup] ${message}`);
  process.exitCode = 1;
});
