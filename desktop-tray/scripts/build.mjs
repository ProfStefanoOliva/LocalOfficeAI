import { existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..");
const distDir = resolve(projectRoot, "dist");
const tscCliPath = resolve(projectRoot, "node_modules", "typescript", "bin", "tsc");

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}

mkdirSync(distDir, { recursive: true });

const tscResult = spawnSync(process.execPath, [tscCliPath, "-p", "tsconfig.json"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: false
});

if (tscResult.status !== 0) {
  process.exit(tscResult.status ?? 1);
}
