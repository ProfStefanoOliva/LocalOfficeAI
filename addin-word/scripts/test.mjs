import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

const buildResult = spawnSync("npm", ["run", "build"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const nodeTestResult = spawnSync(process.execPath, ["tests/taskpane-core.test.mjs"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: false
});

process.exit(nodeTestResult.status ?? 1);
