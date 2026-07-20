import { spawn } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import {
  buildCodexArgs,
  buildGenerationPrompt,
  createCodexEnvironment,
  parseCodexJsonl,
  validateWorkerDraft,
} from "./heads-up-worker-core.mjs";

const POLL_MS = 3000;
const CODEX_TIMEOUT_MS = 180_000;
const MAX_STDOUT_BYTES = 2 * 1024 * 1024;
const MAX_STDERR_BYTES = 64 * 1024;
const WORKER_ID = `${os.hostname()}:${process.pid}`;
const schemaSource = fileURLToPath(new URL("./heads-up-category.schema.json", import.meta.url));

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10_000 });
let stopping = false;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function recoverStaleJobs() {
  await pool.query(`
    UPDATE "HeadsUpGenerationJob"
    SET "status" = CASE WHEN "attemptCount" < 2 THEN 'PENDING' ELSE 'FAILED' END,
        "errorCode" = CASE WHEN "attemptCount" < 2 THEN NULL ELSE 'WORKER_LEASE_EXPIRED' END,
        "lockedAt" = NULL,
        "workerId" = NULL,
        "updatedAt" = NOW()
    WHERE "status" = 'RUNNING'
      AND "lockedAt" < NOW() - INTERVAL '5 minutes'
  `);
}

async function claimJob() {
  const { rows } = await pool.query(`
    WITH candidate AS (
      SELECT "id"
      FROM "HeadsUpGenerationJob"
      WHERE "status" = 'PENDING'
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "HeadsUpGenerationJob" AS job
    SET "status" = 'RUNNING',
        "attemptCount" = job."attemptCount" + 1,
        "lockedAt" = NOW(),
        "workerId" = $1,
        "updatedAt" = NOW()
    FROM candidate
    WHERE job."id" = candidate."id"
    RETURNING job."id", job."requestName", job."explanation", job."instructions", job."attemptCount"
  `, [WORKER_ID]);
  return rows[0] || null;
}

function killProcessGroup(child, signal) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    // The process already exited.
  }
}

async function runCodex(job) {
  const isolatedDirectory = await mkdtemp(path.join(os.tmpdir(), "heads-up-yuri-"));
  const schemaPath = path.join(isolatedDirectory, "category.schema.json");
  await cp(schemaSource, schemaPath);

  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(process.env.HEADS_UP_CODEX_BIN || "codex", buildCodexArgs(schemaPath), {
        cwd: isolatedDirectory,
        detached: true,
        env: createCodexEnvironment(),
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      });
      let settled = false;
      let stdout = "";
      let stderrBytes = 0;

      const finish = (handler, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        clearTimeout(killTimeout);
        handler(value);
      };

      const timeout = setTimeout(() => {
        killProcessGroup(child, "SIGTERM");
        killTimeout = setTimeout(() => killProcessGroup(child, "SIGKILL"), 2000);
      }, CODEX_TIMEOUT_MS);
      let killTimeout = null;

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
        if (Buffer.byteLength(stdout) > MAX_STDOUT_BYTES) {
          killProcessGroup(child, "SIGKILL");
          finish(reject, new Error("CODEX_OUTPUT_LIMIT"));
        }
      });
      child.stderr.on("data", (chunk) => {
        stderrBytes += chunk.length;
        if (stderrBytes > MAX_STDERR_BYTES) {
          killProcessGroup(child, "SIGKILL");
          finish(reject, new Error("CODEX_ERROR_LIMIT"));
        }
      });
      child.once("error", (error) => finish(reject, error));
      child.once("close", (code) => {
        if (code !== 0) return finish(reject, new Error(code === null ? "CODEX_TIMEOUT" : "CODEX_FAILED"));
        try {
          finish(resolve, validateWorkerDraft(parseCodexJsonl(stdout)));
        } catch (error) {
          finish(reject, error);
        }
      });
      child.stdin.end(buildGenerationPrompt(job));
    });
  } finally {
    await rm(isolatedDirectory, { recursive: true, force: true });
  }
}

async function markReady(jobId, result) {
  await pool.query(`
    UPDATE "HeadsUpGenerationJob"
    SET "status" = 'READY', "result" = $2::jsonb, "errorCode" = NULL,
        "lockedAt" = NULL, "workerId" = NULL, "updatedAt" = NOW()
    WHERE "id" = $1 AND "status" = 'RUNNING' AND "workerId" = $3
  `, [jobId, JSON.stringify(result), WORKER_ID]);
}

async function markFailed(job) {
  const retry = job.attemptCount < 2;
  await pool.query(`
    UPDATE "HeadsUpGenerationJob"
    SET "status" = $2, "errorCode" = $3, "lockedAt" = NULL,
        "workerId" = NULL, "updatedAt" = NOW()
    WHERE "id" = $1 AND "status" = 'RUNNING' AND "workerId" = $4
  `, [job.id, retry ? "PENDING" : "FAILED", retry ? null : "GENERATION_FAILED", WORKER_ID]);
}

async function cleanupOldJobs() {
  await pool.query(`
    DELETE FROM "HeadsUpGenerationJob"
    WHERE "status" IN ('FAILED', 'IMPORTED', 'CANCELLED')
      AND "updatedAt" < NOW() - INTERVAL '7 days'
  `);
}

async function main() {
  await recoverStaleJobs();
  await cleanupOldJobs();
  let lastMaintenance = Date.now();

  while (!stopping) {
    const job = await claimJob();
    if (!job) {
      if (Date.now() - lastMaintenance > 60_000) {
        await recoverStaleJobs();
        lastMaintenance = Date.now();
      }
      await sleep(POLL_MS);
      continue;
    }

    try {
      const result = await runCodex(job);
      await markReady(job.id, result);
      console.info("Heads Up category generation ready", { jobId: job.id });
    } catch {
      await markFailed(job);
      console.warn("Heads Up category generation attempt failed", { jobId: job.id, attempt: job.attemptCount });
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => { stopping = true; });
}

main()
  .catch((error) => {
    console.error("Heads Up Yuri worker stopped", { code: error.code || "UNKNOWN" });
    process.exitCode = 1;
  })
  .finally(() => pool.end());
