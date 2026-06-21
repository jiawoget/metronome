import { spawn } from "node:child_process";
import { setInterval } from "node:timers";
import { fileURLToPath } from "node:url";
import { stabilizeNextEnv } from "./stabilize-next-env.mjs";

const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url)
);
const child = spawn(process.execPath, [nextBin, "dev"], {
  stdio: "inherit"
});

const stabilizeTimer = setInterval(stabilizeNextEnv, 500);
let requestedShutdown = false;

function stopChild(signal) {
  requestedShutdown = true;

  if (!child.killed) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => stopChild("SIGINT"));
process.on("SIGTERM", () => stopChild("SIGTERM"));

child.on("exit", (code, signal) => {
  clearInterval(stabilizeTimer);
  stabilizeNextEnv();

  if (requestedShutdown || signal) {
    process.exitCode = 0;
  } else {
    process.exitCode = code ?? 0;
  }
});
