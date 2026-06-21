import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { stabilizeNextEnv } from "./stabilize-next-env.mjs";

const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url)
);
const nextBuildArgs = process.argv.slice(2);
const child = spawn(process.execPath, [nextBin, "build", ...nextBuildArgs], {
  stdio: "inherit"
});

const signalExitCodes = {
  SIGINT: 130,
  SIGTERM: 143
};

let cleanupDone = false;
let parentSignal = null;
let forceExitTimer = null;

function cleanup() {
  if (cleanupDone) {
    return;
  }

  cleanupDone = true;
  stabilizeNextEnv();
}

function removeSignalHandlers() {
  process.off("SIGINT", handleSigint);
  process.off("SIGTERM", handleSigterm);
}

function exitWithSignal(signal) {
  removeSignalHandlers();
  process.kill(process.pid, signal);
}

function handleParentSignal(signal) {
  if (parentSignal) {
    return;
  }

  parentSignal = signal;
  cleanup();

  if (child.exitCode === null && child.signalCode === null && !child.killed) {
    child.kill(signal);
  }

  forceExitTimer = setTimeout(() => {
    cleanup();

    if (child.exitCode === null && child.signalCode === null && !child.killed) {
      child.kill("SIGKILL");
    }

    process.exit(signalExitCodes[signal] ?? 1);
  }, 5000);
  forceExitTimer.unref();
}

function handleSigint() {
  handleParentSignal("SIGINT");
}

function handleSigterm() {
  handleParentSignal("SIGTERM");
}

process.on("SIGINT", handleSigint);
process.on("SIGTERM", handleSigterm);

child.on("error", () => {
  cleanup();
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  cleanup();

  if (forceExitTimer) {
    clearTimeout(forceExitTimer);
  }

  if (parentSignal) {
    exitWithSignal(parentSignal);
    return;
  }

  if (signal) {
    exitWithSignal(signal);
    return;
  }

  process.exitCode = code ?? 0;
});
