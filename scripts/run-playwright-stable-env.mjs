import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const playwrightBin = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url)
);
const e2eServerBin = fileURLToPath(
  new URL("./run-next-e2e-server.mjs", import.meta.url)
);

const args = process.argv.slice(2);
const env = { ...process.env };
const e2eHost = env.E2E_HOST ?? "127.0.0.1";
const e2ePort = env.E2E_PORT ?? "3101";
const e2eBaseUrl = `http://${e2eHost}:${e2ePort}`;

delete env.NO_COLOR;
delete env.FORCE_COLOR;

let shuttingDown = false;
let serverProcess = null;
let testProcess = null;

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
    child.once("error", () => resolve({ code: 1, signal: null }));
  });
}

function stopProcessTree(child) {
  if (
    !child ||
    child.exitCode !== null ||
    child.signalCode !== null ||
    child.killed
  ) {
    return Promise.resolve();
  }

  if (process.platform === "win32" && child.pid) {
    const childExit = waitForExit(child);
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore"
    });

    return Promise.race([
      childExit,
      waitForExit(killer).then(() => childExit),
      new Promise((resolve) => setTimeout(resolve, 5000))
    ]);
  }

  const childExit = waitForExit(child);
  child.kill("SIGTERM");

  return Promise.race([
    childExit,
    new Promise((resolve) => {
      setTimeout(() => {
        if (
          child.exitCode === null &&
          child.signalCode === null &&
          !child.killed
        ) {
          child.kill("SIGKILL");
        }

        resolve();
      }, 5000);
    })
  ]);
}

async function waitForServer(child) {
  const startedAt = Date.now();
  const deadlineMs = 120_000;

  let serverExit = null;
  child.once("exit", (code, signal) => {
    serverExit = { code, signal };
  });

  while (Date.now() - startedAt < deadlineMs) {
    if (serverExit) {
      throw new Error(
        `E2E server exited before becoming ready: code=${serverExit.code ?? "null"} signal=${serverExit.signal ?? "null"}`
      );
    }

    const isReady = await fetch(e2eBaseUrl)
      .then((response) => response.status < 500)
      .catch(() => false);

    if (isReady) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for E2E server at ${e2eBaseUrl}.`);
}

async function run() {
  serverProcess = spawn(process.execPath, [e2eServerBin], {
    stdio: "inherit",
    env
  });

  try {
    await waitForServer(serverProcess);
  } catch (error) {
    await stopProcessTree(serverProcess);
    throw error;
  }

  testProcess = spawn(process.execPath, [playwrightBin, "test", ...args], {
    stdio: "inherit",
    env: {
      ...env,
      PLAYWRIGHT_SKIP_WEB_SERVER: "1"
    }
  });

  const result = await waitForExit(testProcess);

  await stopProcessTree(serverProcess);

  if (result.signal) {
    process.kill(process.pid, result.signal);
    return;
  }

  process.exit(result.code ?? 0);
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (
    testProcess &&
    testProcess.exitCode === null &&
    testProcess.signalCode === null &&
    !testProcess.killed
  ) {
    testProcess.kill(signal);
  }

  await stopProcessTree(serverProcess);
  process.exit(signal === "SIGINT" ? 130 : 143);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

run().catch(async (error) => {
  await stopProcessTree(serverProcess);
  console.error(error);
  process.exit(1);
});
