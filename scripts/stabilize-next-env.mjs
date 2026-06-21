import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const nextEnvPath = fileURLToPath(new URL("../next-env.d.ts", import.meta.url));
const unstableRouteImportPattern =
  /^import "\.\/\.next(?:\/dev)*\/types\/routes\.d\.ts";\r?\n/gm;

export function stabilizeNextEnv() {
  const current = readFileSync(nextEnvPath, "utf8");
  const stable = current.replace(unstableRouteImportPattern, "");

  if (stable !== current) {
    writeFileSync(nextEnvPath, stable);
  }
}

stabilizeNextEnv();
