import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { stabilizeNextEnv } from "./stabilize-next-env.mjs";

const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url)
);
const host = process.env.E2E_HOST ?? "127.0.0.1";
const port = process.env.E2E_PORT ?? "3101";

let activeChild = null;
let shuttingDown = false;
let forceExitTimer = null;

function isChildRunning(child) {
  return (
    child &&
    child.exitCode === null &&
    child.signalCode === null &&
    !child.killed
  );
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
    child.once("error", () => resolve({ code: 1, signal: null }));
  });
}

function killChildTree(child, signal) {
  if (!isChildRunning(child)) {
    return;
  }

  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore"
    });
    return;
  }

  child.kill(signal);
}

async function runNext(args) {
  const child = spawn(process.execPath, [nextBin, ...args], {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_METRONOME_E2E: "1"
    }
  });
  activeChild = child;

  const result = await waitForExit(child);

  if (activeChild === child) {
    activeChild = null;
  }

  stabilizeNextEnv();
  return result;
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  stabilizeNextEnv();
  killChildTree(activeChild, signal);

  forceExitTimer = setTimeout(() => {
    stabilizeNextEnv();
    process.exit(0);
  }, 5000);
  forceExitTimer.unref();

  if (activeChild) {
    await waitForExit(activeChild);
  }

  if (forceExitTimer) {
    clearTimeout(forceExitTimer);
  }

  stabilizeNextEnv();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

const buildResult = await runNext(["build"]);

if (shuttingDown) {
  process.exit(0);
}

if (buildResult.signal) {
  process.kill(process.pid, buildResult.signal);
}

if (buildResult.code !== 0) {
  process.exit(buildResult.code ?? 1);
}

const startResult = await runNext([
  "start",
  "--hostname",
  host,
  "--port",
  port
]);

if (shuttingDown) {
  process.exit(0);
}

if (startResult.signal) {
  process.kill(process.pid, startResult.signal);
}

process.exit(startResult.code ?? 0);
