import pLimit from "p-limit";

import { handleJob } from "./handlers.js";

const JOBS_COLLECTION = "CharacterStudioBakeJobs";

function errorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}

export function createQueue({
  pb,
  ensureAuth,
  r2,
  concurrency,
  pollIntervalMs,
}) {
  const limit = pLimit(concurrency);
  const inFlight = new Set();
  let pollTimer;
  let stopped = false;
  let pollPromise;
  let lastPollAt = null;

  async function withAuth(operation) {
    await ensureAuth();

    try {
      return await operation();
    } catch (error) {
      if (error?.status !== 401) {
        throw error;
      }

      await ensureAuth(error);
      return operation();
    }
  }

  async function processJob(job) {
    try {
      // Jobs are idempotent by design because bakes are content-addressed, so
      // an occasional double-processing is harmless.
      await withAuth(() => handleJob(pb, r2, job));
      await withAuth(() =>
        pb.collection(JOBS_COLLECTION).update(job.id, {
          status: "done",
          error: "",
        }),
      );
      console.log(`[queue] Job ${job.id} completed`);
    } catch (error) {
      const message = errorMessage(error);
      const shouldRetry = job.attempts < 2;

      await withAuth(() =>
        pb.collection(JOBS_COLLECTION).update(job.id, {
          status: shouldRetry ? "queued" : "error",
          error: message,
        }),
      );
      console.error(
        `[queue] Job ${job.id} failed${shouldRetry ? "; re-queued" : ""}: ${message}`,
      );
    }
  }

  function dispatch(job) {
    const task = limit(() => processJob(job));
    inFlight.add(task);
    task
      .catch((error) => {
        console.error(
          `[queue] Could not finalize job ${job.id}: ${errorMessage(error)}`,
        );
      })
      .finally(() => {
        inFlight.delete(task);
      });
  }

  async function poll() {
    if (stopped) {
      return;
    }

    lastPollAt = new Date().toISOString();

    try {
      const jobs = await withAuth(() =>
        pb.collection(JOBS_COLLECTION).getList(1, concurrency * 2, {
          filter: 'status = "queued"',
          sort: "created",
        }),
      );

      for (const queuedJob of jobs.items) {
        if (stopped) {
          break;
        }

        // This read-then-update claim is sufficient for the single worker in
        // v1, but multiple workers could race and claim the same queued job.
        const job = await withAuth(() =>
          pb.collection(JOBS_COLLECTION).update(queuedJob.id, {
            status: "running",
            attempts: (queuedJob.attempts ?? 0) + 1,
            error: "",
          }),
        );
        dispatch(job);
      }
    } catch (error) {
      console.error(`[queue] Poll failed: ${errorMessage(error)}`);
    } finally {
      if (!stopped) {
        pollTimer = setTimeout(runPoll, pollIntervalMs);
      }
    }
  }

  function runPoll() {
    pollPromise = poll().finally(() => {
      pollPromise = undefined;
    });
  }

  function start() {
    if (stopped || pollPromise || pollTimer) {
      return;
    }
    runPoll();
  }

  async function stop(timeoutMs = 30_000) {
    stopped = true;
    clearTimeout(pollTimer);

    const drain = async () => {
      if (pollPromise) {
        await pollPromise;
      }
      while (inFlight.size > 0) {
        await Promise.allSettled([...inFlight]);
      }
    };

    let timeout;
    const timedOut = await Promise.race([
      drain().then(() => false),
      new Promise((resolve) => {
        timeout = setTimeout(() => resolve(true), timeoutMs);
      }),
    ]);
    clearTimeout(timeout);
    return { timedOut };
  }

  return {
    start,
    stop,
    get jobsInFlight() {
      return inFlight.size;
    },
    get lastPollAt() {
      return lastPollAt;
    },
  };
}
