import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(import.meta.dirname, "..", "dist");

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
