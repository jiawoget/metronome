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

child.on("exit", (code, signal) => {
  stabilizeNextEnv();

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 0;
});
