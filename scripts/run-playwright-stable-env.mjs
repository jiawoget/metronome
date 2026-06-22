import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const playwrightBin = fileURLToPath(
  new URL("../node_modules/playwright/cli.js", import.meta.url)
);

const args = process.argv.slice(2);
const env = { ...process.env };

delete env.NO_COLOR;
delete env.FORCE_COLOR;

const child = spawn(process.execPath, [playwrightBin, "test", ...args], {
  stdio: "inherit",
  env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
